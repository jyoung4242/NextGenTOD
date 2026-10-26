// InventorySystem.ts

import { EventEmitter } from "excalibur";
import { StateStore } from "../../GameState";
import { GameState, ItemInstance } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";

export interface AddItemResult {
  success: boolean;
  reason?: "overburdened" | "item_not_found";
  addedQuantity: number;
}

export interface InventoryEventMap {
  "inventory:item-added": { instance: ItemInstance; quantity: number };
  "inventory:stack-updated": {
    instanceId: string;
    definitionId: string;
    previousQuantity: number;
    newQuantity: number;
    delta: number;
  };
  "inventory:item-removed": { instanceId: string; definitionId: string; quantityRemoved: number; remainingQuantity: number };
}

export class InventorySystem {
  private emitter = new EventEmitter<InventoryEventMap>();

  constructor(
    private store: StateStore<GameState>,
    private contentRegistry: ContentRegistry,
  ) {}

  public on<E extends keyof InventoryEventMap>(event: E, handler: (payload: InventoryEventMap[E]) => void): void {
    this.emitter.on(event, handler);
  }

  public off<E extends keyof InventoryEventMap>(event: E, handler: (payload: InventoryEventMap[E]) => void): void {
    this.emitter.off(event, handler);
  }

  public getTotalWeight(): number {
    const { items } = this.store.get().inventory;
    const validItems = (items ?? []).filter(item => item && typeof item.definitionId === "string");

    return validItems.reduce((total, item) => {
      const def = this.contentRegistry.getItem(item.definitionId);
      return total + (def ? def.weight * item.quantity : 0);
    }, 0);
  }

  public hasItem(definitionId: string, quantity = 1): boolean {
    const { items } = this.store.get().inventory;
    const totalCount = (items ?? []).filter(i => i && i.definitionId === definitionId).reduce((sum, i) => sum + i.quantity, 0);
    return totalCount >= quantity;
  }

  public addItem(definitionId: string, quantity = 1): AddItemResult {
    const def = this.contentRegistry.getItem(definitionId);
    if (!def) {
      return { success: false, reason: "item_not_found", addedQuantity: 0 };
    }

    const currentWeight = this.getTotalWeight();
    const addedWeight = def.weight * quantity;
    const inventoryState = this.store.get().inventory;

    if (currentWeight + addedWeight > inventoryState.maxWeight) {
      return { success: false, reason: "overburdened", addedQuantity: 0 };
    }

    const currentItems = inventoryState.items ?? [];
    const eventsToEmit: Array<
      | { type: "added"; instance: ItemInstance; qty: number }
      | { type: "stack"; id: string; defId: string; prev: number; next: number; delta: number }
    > = [];

    this.store.batch(ctx => {
      let items: ItemInstance[] = currentItems.filter(i => i && typeof i.definitionId === "string").map(i => ({ ...i }));

      if (def.stackable) {
        const maxStack = def.maxStackSize ?? 99;
        let remainingToAdd = quantity;

        items = items.map(item => {
          if (remainingToAdd > 0 && item.definitionId === definitionId && item.quantity < maxStack) {
            const spaceInStack = maxStack - item.quantity;
            const toAdd = Math.min(spaceInStack, remainingToAdd);
            const prevQty = item.quantity;
            const newQty = prevQty + toAdd;

            remainingToAdd -= toAdd;
            eventsToEmit.push({
              type: "stack",
              id: item.instanceId,
              defId: definitionId,
              prev: prevQty,
              next: newQty,
              delta: toAdd,
            });

            return { ...item, quantity: newQty };
          }
          return { ...item };
        });

        while (remainingToAdd > 0) {
          const stackAmount = Math.min(maxStack, remainingToAdd);
          const newInstance: ItemInstance = {
            instanceId: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            definitionId,
            quantity: stackAmount,
          };
          items.push(newInstance);
          eventsToEmit.push({ type: "added", instance: newInstance, qty: stackAmount });
          remainingToAdd -= stackAmount;
        }
      } else {
        for (let i = 0; i < quantity; i++) {
          const newInstance: ItemInstance = {
            instanceId: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            definitionId,
            quantity: 1,
          };
          items.push(newInstance);
          eventsToEmit.push({ type: "added", instance: newInstance, qty: 1 });
        }
      }

      ctx.set("inventory", {
        ...inventoryState,
        items,
      });
    });

    for (const ev of eventsToEmit) {
      if (ev.type === "added") {
        this.emitter.emit("inventory:item-added", { instance: ev.instance, quantity: ev.qty });
      } else if (ev.type === "stack") {
        this.emitter.emit("inventory:stack-updated", {
          instanceId: ev.id,
          definitionId: ev.defId,
          previousQuantity: ev.prev,
          newQuantity: ev.next,
          delta: ev.delta,
        });
      }
    }

    return { success: true, addedQuantity: quantity };
  }

  public removeItem(instanceId: string, quantity = 1): boolean {
    const inventoryState = this.store.get().inventory;
    const items = (inventoryState.items ?? []).map(i => ({ ...i }));
    const index = items.findIndex(i => i && i.instanceId === instanceId);

    if (index === -1) return false;

    let removedEventData: { instanceId: string; definitionId: string; quantityRemoved: number; remainingQuantity: number } | null =
      null;

    this.store.batch(ctx => {
      const targetItem = items[index];
      const defId = targetItem.definitionId;

      if (targetItem.quantity > quantity) {
        targetItem.quantity -= quantity;
        removedEventData = {
          instanceId,
          definitionId: defId,
          quantityRemoved: quantity,
          remainingQuantity: targetItem.quantity,
        };
      } else {
        const removedQty = targetItem.quantity;
        items.splice(index, 1);
        removedEventData = {
          instanceId,
          definitionId: defId,
          quantityRemoved: removedQty,
          remainingQuantity: 0,
        };
      }

      ctx.set("inventory", {
        ...inventoryState,
        items,
      });
    });

    if (removedEventData) {
      this.emitter.emit("inventory:item-removed", removedEventData);
    }

    return true;
  }
}
