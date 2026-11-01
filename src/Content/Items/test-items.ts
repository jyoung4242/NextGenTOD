// Content/Items/test-items.ts
import { ItemDefinition } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

// Extend ItemDefinition locally or in GameTypes to include optional equipment properties:
// equipmentSlot?: "head" | "chest" | "mainHand" | "offHand" | "accessory";
// statModifiers?: { attack?: number; defense?: number; hp?: number };

export const healthPotionItem: ItemDefinition & { equipmentSlot?: string } = {
  id: "potion_health_minor",
  name: "Minor Health Potion",
  description: "Restores 25 Health.",
  category: "consumable",
  stackable: true,
  maxStackSize: 10,
  weight: 0.5,
};

export const ironSwordItem: ItemDefinition & { equipmentSlot?: string } = {
  id: "weapon_iron_sword",
  name: "Iron Sword",
  description: "A sturdy blade for dungeon crawling.",
  category: "equipment",
  stackable: false,
  weight: 4.0,
  equipmentSlot: "mainHand", // 👈 Maps to player.equipment.mainHand
  // 👈 Require One-Handed skill at level 2 to equip
  requiredSkill: "oneHanded",
  minLevel: 1,
};

export const woodenSwordItem: ItemDefinition & { equipmentSlot?: string } = {
  id: "weapon_wooden_sword",
  name: "Wooden Sword",
  description: "A weak blade for dungeon crawling.",
  category: "equipment",
  stackable: false,
  weight: 1.0,
  equipmentSlot: "mainHand", // 👈 Maps to player.equipment.mainHand
  // 👈 Require One-Handed skill at level 2 to equip
  requiredSkill: "oneHanded",
  minLevel: 1,
};

export const leatherArmorItem: ItemDefinition & { equipmentSlot?: string } = {
  id: "armor_leather_chest",
  name: "Leather Tunic",
  description: "Provides basic torso protection.",
  category: "equipment",
  stackable: false,
  weight: 6.0,
  equipmentSlot: "chest", // 👈 Maps to player.equipment.chest
};

export function registerTestItems(registry: ContentRegistry): void {
  registry.registerItem(healthPotionItem);
  registry.registerItem(ironSwordItem);
  registry.registerItem(woodenSwordItem);
  registry.registerItem(leatherArmorItem);
}
