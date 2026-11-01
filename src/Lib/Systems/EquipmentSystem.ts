// Lib/Systems/EquipmentSystem.ts
import { StateStore } from "../../GameState";
import { GameState, ItemInstance, EquipmentSlot } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";
import { ToastManager } from "../../UI/ToastManager";

export class EquipmentSystem {
  constructor(
    private store: StateStore<GameState>,
    private contentRegistry: ContentRegistry,
    private toastMgr: ToastManager,
  ) {}

  /**
   * Equips an item instance from inventory into its corresponding equipment slot.
   */
  public equipItem(instanceId: string): boolean {
    const state = this.store.get();
    const items = [...state.inventory.items];
    const itemIndex = items.findIndex(i => i && i.instanceId === instanceId);

    if (itemIndex === -1) return false;

    const itemInstance = items[itemIndex];
    const itemDef = this.contentRegistry.getItem(itemInstance.definitionId);

    // Ensure the item is valid and has a designated equipment slot
    const slot = (itemDef as any)?.equipmentSlot as EquipmentSlot | undefined;
    if (!slot) {
      console.warn(`[EquipmentSystem]: Item ${itemInstance.definitionId} cannot be equipped.`);
      return false;
    }

    // 🛡️ CHECK SKILL & LEVEL REQUIREMENTS
    if (itemDef.requiredSkill || itemDef.minLevel) {
      const playerLevel = state.progression?.level ?? 1;
      const requiredLevel = itemDef.minLevel ?? 1;

      // 1. Check minimum player level requirement
      if (playerLevel < requiredLevel) {
        this.toastMgr.show("item", "Cannot Equip", `Requires Level ${requiredLevel} to equip ${itemDef.name}.`);
        return false;
      }

      // 2. Check skill requirement if specified
      if (itemDef.requiredSkill) {
        const skillData = state.player.skills?.[itemDef.requiredSkill];
        const playerSkillLevel = skillData?.level ?? 0;

        // Assuming required skill level maps to minLevel or defaults to 1 if not specified
        const requiredSkillLevel = itemDef.minLevel ?? 1;

        if (playerSkillLevel < requiredSkillLevel) {
          this.toastMgr.show("item", "Cannot Equip", `Requires ${itemDef.requiredSkill} Level ${requiredSkillLevel}!`);
          return false;
        }
      }
    }

    const currentEquipment = { ...state.player.equipment };
    const currentlyEquippedInSlot = currentEquipment[slot];

    this.store.batch(ctx => {
      // 1. Remove the item from inventory list
      items.splice(itemIndex, 1);

      // 2. If something was already equipped in that slot, put it back into inventory
      if (currentlyEquippedInSlot) {
        items.push(currentlyEquippedInSlot);
      }

      // 3. Assign the new item to the equipment slot
      currentEquipment[slot] = itemInstance;

      // 4. Update store state atomically
      ctx.set("inventory.items", items);
      ctx.set("player.equipment", currentEquipment);
    });

    console.log(`[Equipment]: Equipped ${itemDef?.name} to slot [${slot}]`);
    return true;
  }

  /**
   * Unequips an item from a slot and returns it back to inventory.
   */
  public unequipItem(slot: EquipmentSlot): boolean {
    const state = this.store.get();
    const currentEquipment = { ...state.player.equipment };
    const equippedItem = currentEquipment[slot];

    if (!equippedItem) return false; // Nothing in slot to unequip

    const items = [...state.inventory.items];

    this.store.batch(ctx => {
      // 1. Clear the equipment slot
      currentEquipment[slot] = undefined;

      // 2. Push the item back into inventory
      items.push(equippedItem);

      // 3. Update store state atomically
      ctx.set("inventory.items", items);
      ctx.set("player.equipment", currentEquipment);
    });

    console.log(`[Equipment]: Unequipped item from slot [${slot}] back to inventory`);
    return true;
  }
}
