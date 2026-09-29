// Content/Items/test-items.ts
import { ItemDefinition } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const bossKeyItem: ItemDefinition = {
  id: "key_east-to-boss",
  name: "Boss Key",
  description: "Unlocks the heavy door leading to the boss chamber.",
};

export function registerTestItems(registry: ContentRegistry): void {
  registry.registerItem(bossKeyItem);
}
