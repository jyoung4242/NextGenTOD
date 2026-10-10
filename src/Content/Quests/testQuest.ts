import { QuestDefinitionData } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";
import { healthPotionItem } from "../Items/test-items";

export const testQuest: QuestDefinitionData = {
  id: "find-potion",
  metadata: {
    title: "A Swift Recovery",
    description: "Find and pick up the minor health potion sitting in the dungeon hallway.",
    giverNpc: "dungeon_guide",
  },
  objectives: [
    {
      id: "pickup_potion",
      description: "Collect a Minor Health Potion",
      type: "collect",
      target: "potion_health_minor",
      count: 1,
    },
  ],
  rewards: {
    items: ["potion_health_minor"],
  },
  triggers: {
    onStart: {
      setsFlag: ["quest_find_potion_started"],
    },
    onComplete: {
      setsFlag: ["quest_find_potion_completed"],
    },
  },
};

export function registerQuest(registry: ContentRegistry): void {
  registry.registerQuest(testQuest);
}
