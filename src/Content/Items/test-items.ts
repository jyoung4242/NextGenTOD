// Content/Items/test-items.ts
import { ItemDefinition } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const healthPotionItem: ItemDefinition = {
  id: "potion_health_minor",
  name: "Minor Health Potion",
  description: "Restores 25 Health.",
  category: "consumable",
  stackable: true,
  maxStackSize: 10,
  weight: 0.5,
  textureKey: "potion", // Assuming you have a texture for this item
};

export function registerTestItems(registry: ContentRegistry): void {
  registry.registerItem(healthPotionItem);
}
