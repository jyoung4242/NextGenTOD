// Content/WorldProps/farmhouse-bed.ts
import { WorldPropDefinition } from "../../GameTypes";

export const farmhouseBedProp: WorldPropDefinition = {
  id: "farmhouse_bed",
  name: "Farmhouse Bed",
  facing: "south",
  sprite: {
    baseKey: "farmhouse-bed",
    directions: 4,
    mirrorHorizontal: true,
    variants: {
      front: "farmhouse_bed",
      back: "farmhouse_bed",
      left: "farmhouse_bed_1",
      right: "farmhouse_bed_1",
    },
  },
  scale: 0.5,
  yOffset: 0.6,
  blocksMovement: true,
};
