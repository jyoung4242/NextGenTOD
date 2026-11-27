// Content/Npcs/farm-npcs.ts
import { NPCDefinition } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const FARM_NPCS: NPCDefinition[] = [
  {
    position: { x: 2, y: 8 },
    id: "aunt_millie",
    name: "Aunt Millie",
    textureKey: "npc_farmer_wife",
    avatarKey: "npc_farmer_wife_avatar",
    scale: 0.6,
    yOffset: 0.2,
    cutsceneId: "aunt-millie",
    // requiredFlag: "met_martha_morning", // Optional: gates talk until opening chore/intro flag is set
    //succeedsFlag: "spoke_thomas_mill", // Optional: prevents repeating the initial cutscene
  },
];

export function registerFarmNpcs(registry: ContentRegistry): void {
  FARM_NPCS.forEach(npc => registry.registerNpc(npc));
}
