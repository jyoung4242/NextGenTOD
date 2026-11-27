// Content/WorldProps/farmhouse-bed.ts
import { WorldPropDefinition } from "../../GameTypes";

export const stove: WorldPropDefinition = {
  id: "stove",
  name: "stove",
  facing: "east",
  sprite: {
    baseKey: "stove",
    directions: 4,
    mirrorHorizontal: false,
    variants: {
      front: "stove",
      back: "stove",
      left: "stove1",
      right: "stove2",
    },
  },
  scale: 0.5,
  yOffset: 0.6,
  blocksMovement: true,
};
