// Content/Dungeons/farmhouse.ts
import { DungeonDefinition, dungeonFromAscii } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const farmhouse: DungeonDefinition = {
  id: "farmhouse",
  defaultWallTexture: "wood_walls",
  defaultFloorTexture: "wood_floor",
  defaultCeilingTexture: "wood_ceiling",
  wallTextures: ["wood_walls_1", "wood_walls_2"],
  //onEnterCutsceneId: "farm-intro",
  items: [],
  props: [
    {
      id: "player-bedroom-bed",
      definitionId: "farmhouse_bed",
      position: { x: 2, y: 5 },
      facing: "south",
    },
    {
      id: "npc1-bedroom-bed",
      definitionId: "farmhouse_bed",
      position: { x: 7, y: 4 },
      facing: "east",
    },
    {
      id: "npc2-bedroom-bed",
      definitionId: "farmhouse_bed",
      position: { x: 11, y: 3 },
      facing: "east",
    },
    {
      id: "npc2-chest",
      definitionId: "chest",
      position: { x: 10, y: 5 },
      facing: "north",
    },
    {
      id: "kitchen-stove",
      definitionId: "stove",
      position: { x: 14, y: 9 },
      facing: "east",
    },
  ],

  cutsceneTriggers: [],
  nodes: {
    playerBedroom: {
      id: "playerBedroom",
      type: "entrance",
      bounds: { x: 1, y: 2, width: 3, height: 4 },
      exits: ["hall1"],
    },
    npcBedroom1: {
      id: "npcbd1",
      type: "room",
      bounds: { x: 5, y: 2, width: 3, height: 4 },
      exits: ["hall1"],
    },
    npcBedroom2: {
      id: "npcbd2",
      type: "room",
      bounds: { x: 9, y: 2, width: 3, height: 4 },
      exits: ["hall1"],
    },

    hall1: {
      id: "hall1",
      type: "room",
      bounds: { x: 1, y: 1, width: 13, height: 1 },
      exits: [],
    },
  },

  connections: [
    {
      id: "bedroom-to-hall",
      from: "playerBedroom",
      to: "hall1",
      type: "door",
      portal: {
        x: 1,
        y: 2,
        direction: "north",
      },

      closedTexture: "farm_door",
      openTexture: "farm_door_open",
    },
    {
      id: "npcbd1-to-hall",
      from: "npcbd1",
      to: "hall1",
      type: "door",
      portal: {
        x: 5,
        y: 2,
        direction: "north",
      },

      closedTexture: "farm_door",
      openTexture: "farm_door_open",
    },
    {
      id: "npcbd2-to-hall",
      from: "npcbd2",
      to: "hall1",
      type: "door",
      portal: {
        x: 9,
        y: 2,
        direction: "north",
      },

      closedTexture: "farm_door",
      openTexture: "farm_door_open",
    },
  ],
  npcs: [
    {
      id: "aunt_millie",
      name: "Aunt Millie",
      position: { x: 2, y: 7 },
      cutsceneId: "aunt_millie",
    },
  ],
  lighting: {
    ambientLight: 1.0,
    maxLightingDistance: 16,
    lights: [],
  },

  grid: dungeonFromAscii(
    `
################
#              #
# ### ### ###  #
#   #   #   #  #
#   #   #   #  #
#   #   #   #  #
#############  #
#              #
#       #      #
#       #      #
#       #      #
### ############
################
`,
    {},
  ),
};

export function registerFarmhouse(reg: ContentRegistry) {
  reg.registerDungeon(farmhouse);
}
