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
      bounds: {
        x: 1,
        y: 2,
        width: 3,
        height: 4,
      },
      exits: ["hall1", "hall2", "livingRoom"],
    },
    npcbd1: {
      id: "npcbd1",
      type: "room",
      bounds: {
        x: 5,
        y: 2,
        width: 3,
        height: 4,
      },
      exits: ["hall1"],
    },
    npcbd2: {
      id: "npcbd2",
      type: "room",
      bounds: {
        x: 9,
        y: 2,
        width: 3,
        height: 4,
      },
      exits: ["hall1"],
    },
    hall1: {
      id: "hall1",
      type: "room",
      bounds: {
        x: 1,
        y: 1,
        width: 14,
        height: 1,
      },
      exits: [],
    },
    hall2: {
      id: "hall2",
      type: "room",
      bounds: {
        x: 13,
        y: 2,
        width: 2,
        height: 5,
      },
      exits: ["hall1", "kitchen", "playerBedroom"],
    },
    kitchen: {
      id: "kitchen",
      type: "room",
      bounds: {
        x: 9,
        y: 7,
        width: 6,
        height: 4,
      },
      exits: [],
    },
    livingRoom: {
      id: "livingRoom",
      type: "room",
      bounds: {
        x: 1,
        y: 7,
        width: 7,
        height: 4,
      },
      exits: ["kitchen", "playerBedroom"],
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
    {
      id: "conn_4",
      from: "hall2",
      to: "hall1",
      type: "open",
    },
    {
      id: "conn_5",
      from: "hall2",
      to: "kitchen",
      type: "open",
    },
    {
      id: "conn_6",
      from: "livingRoom",
      to: "kitchen",
      type: "open",
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
