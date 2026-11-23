// Content/Npcs/farm-npcs.ts
import { NPCDefinition } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const FARM_NPCS: NPCDefinition[] = [
  {
    position: { x: 7, y: 2 },
    id: "npc_thomas_mill",
    name: "Thomas",
    textureKey: "npc_farmer", // Make sure this key is loaded in your textures Map
    avatarKey: "npc_farmer",
    scale: 0.6,
    yOffset: 0.2,
    cutsceneId: "mill-father-talk",
    // requiredFlag: "met_martha_morning", // Optional: gates talk until opening chore/intro flag is set
    succeedsFlag: "spoke_thomas_mill", // Optional: prevents repeating the initial cutscene
  },
];

export function registerFarmNpcs(registry: ContentRegistry): void {
  FARM_NPCS.forEach(npc => registry.registerNpc(npc));
}
