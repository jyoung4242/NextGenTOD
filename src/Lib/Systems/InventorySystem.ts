import { StateStore } from "../../GameState";
import { GameState, ItemInstance } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";

export interface AddItemResult {
  success: boolean;
  reason?: "overburdened" | "item_not_found";
  addedQuantity: number;
}

export class InventorySystem {
  constructor(
    private store: StateStore<GameState>,
    private contentRegistry: ContentRegistry,
  ) {}

  public getTotalWeight(): number {
    const { items } = this.store.get().player.inventory;
    return items.reduce((total, item) => {
      const def = this.contentRegistry.getItem(item.definitionId);
      return total + (def ? def.weight * item.quantity : 0);
    }, 0);
  }

  public hasItem(definitionId: string, quantity = 1): boolean {
    const { items } = this.store.get().player.inventory;
    const totalCount = items.filter(i => i.definitionId === definitionId).reduce((sum, i) => sum + i.quantity, 0);
    return totalCount >= quantity;
  }

  public addItem(definitionId: string, quantity = 1): AddItemResult {
    const def = this.contentRegistry.getItem(definitionId);
    if (!def) {
      return { success: false, reason: "item_not_found", addedQuantity: 0 };
    }

    const currentWeight = this.getTotalWeight();
    const addedWeight = def.weight * quantity;
    const { maxWeight } = this.store.get().player.inventory;

    if (currentWeight + addedWeight > maxWeight) {
      return { success: false, reason: "overburdened", addedQuantity: 0 };
    }

    const currentItems = this.store.get().player.inventory.items;

    this.store.batch(ctx => {
      const items: ItemInstance[] = [...currentItems];

      if (def.stackable) {
        const maxStack = def.maxStackSize ?? 99;
        let remainingToAdd = quantity;

        for (const item of items) {
          if (item.definitionId === definitionId && item.quantity < maxStack) {
            const spaceInStack = maxStack - item.quantity;
            const toAdd = Math.min(spaceInStack, remainingToAdd);
            item.quantity += toAdd;
            remainingToAdd -= toAdd;
            if (remainingToAdd <= 0) break;
          }
        }

        while (remainingToAdd > 0) {
          const stackAmount = Math.min(maxStack, remainingToAdd);
          items.push({
            instanceId: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            definitionId,
            quantity: stackAmount,
          });
          remainingToAdd -= stackAmount;
        }
      } else {
        for (let i = 0; i < quantity; i++) {
          items.push({
            instanceId: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            definitionId,
            quantity: 1,
          });
        }
      }

      ctx.set("player.inventory.items", items);
    });

    return { success: true, addedQuantity: quantity };
  }

  public removeItem(instanceId: string, quantity = 1): boolean {
    const items = [...this.store.get().player.inventory.items];
    const index = items.findIndex(i => i.instanceId === instanceId);

    if (index === -1) return false;

    this.store.batch(ctx => {
      const item = items[index];
      if (item.quantity > quantity) {
        item.quantity -= quantity;
      } else {
        items.splice(index, 1);
      }
      ctx.set("player.inventory.items", items);
    });

    return true;
  }
}
