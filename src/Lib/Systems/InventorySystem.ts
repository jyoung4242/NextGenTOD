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

    // Filter out corrupted/undefined items to prevent crashes
    const validItems = items.filter(item => item && typeof item.definitionId === "string");

    return validItems.reduce((total, item) => {
      const def = this.contentRegistry.getItem(item.definitionId);
      return total + (def ? def.weight * item.quantity : 0);
    }, 0);
  }

  public hasItem(definitionId: string, quantity = 1): boolean {
    const { items } = this.store.get().player.inventory;
    const totalCount = items.filter(i => i && i.definitionId === definitionId).reduce((sum, i) => sum + i.quantity, 0);
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

    // Get current items and clean/clone them immutably
    const currentItems = this.store.get().player.inventory.items;

    this.store.batch(ctx => {
      // Filter out invalid/undefined items and clone the rest
      let items: ItemInstance[] = currentItems.filter(i => i && typeof i.definitionId === "string").map(i => ({ ...i }));

      if (def.stackable) {
        const maxStack = def.maxStackSize ?? 99;
        let remainingToAdd = quantity;

        // Try filling existing stacks first
        items = items.map(item => {
          if (remainingToAdd > 0 && item.definitionId === definitionId && item.quantity < maxStack) {
            const spaceInStack = maxStack - item.quantity;
            const toAdd = Math.min(spaceInStack, remainingToAdd);
            remainingToAdd -= toAdd;
            return { ...item, quantity: item.quantity + toAdd };
          }
          return item;
        });

        // Push new stacks if quantity remains
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
        // Non-stackable: append new individual item instances
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

    // Optional debug log to confirm successful pickup
    const updatedInventory = this.store.get().player.inventory;
    console.log("[Inventory Updated]:", {
      addedItem: def.name,
      quantityAdded: quantity,
      totalWeight: `${this.getTotalWeight()}/${updatedInventory.maxWeight}`,
      items: updatedInventory.items,
    });

    return { success: true, addedQuantity: quantity };
  }

  public removeItem(instanceId: string, quantity = 1): boolean {
    const items = this.store.get().player.inventory.items;
    const index = items.findIndex(i => i && i.instanceId === instanceId);

    if (index === -1) return false;

    this.store.batch(ctx => {
      const targetItem = items[index];
      let updatedItems: ItemInstance[];

      if (targetItem.quantity > quantity) {
        updatedItems = items.map((i, idx) => (idx === index ? { ...i, quantity: i.quantity - quantity } : { ...i }));
      } else {
        updatedItems = items.filter((_, idx) => idx !== index).map(i => ({ ...i }));
      }

      ctx.set("player.inventory.items", updatedItems);
    });

    return true;
  }
}
