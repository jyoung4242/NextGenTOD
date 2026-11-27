// Content/WorldProps/chest.ts
import { WorldPropDefinition } from "../../GameTypes";

export const chest: WorldPropDefinition = {
  id: "chest",
  name: "Chest",
  facing: "south",
  sprite: {
    baseKey: "chestClosed",
    directions: 4,
    variants: {
      front: "chestClosed",
      back: "chestClosed",
      left: "chestClosed",
      right: "chestClosed",
    },
  },
  scale: 0.45,
  yOffset: 0.5,
  blocksMovement: true,
  container: {
    locked: true,
    requiredKeyId: "farmHouseKey",
    gold: 25,
    items: [
      { itemId: "potion_health_minor", quantity: 2 },
      { keyId: "mill_key", quantity: 1 },
    ],
    cutsceneId: "open_supply_chest",
    succeedsFlag: "opened_supply_chest",
    openedTextureKey: "chestOpen",
  },
};
