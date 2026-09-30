import { DungeonDefinition, dungeonFromAscii } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const testDungeon: DungeonDefinition = {
  id: "test-dungeon",
  items: [
    {
      itemId: "alcove-key",
      keyId: "key_east-to-boss",
      position: { x: 6, y: 1 }, // Located inside northAlcove
      quantity: 1,
    },
    {
      itemId: "potion_health_minor",
      position: { x: 12, y: 9 }, // Located in the hallway near entrance
      quantity: 2,
    },
  ],
  nodes: {
    start: {
      id: "start",
      type: "entrance",
      bounds: {
        x: 1,
        y: 1,
        width: 3,
        height: 3,
      },
      exits: ["hallway"],
    },

    hallway: {
      id: "hallway",
      type: "corridor",
      bounds: {
        x: 4,
        y: 2,
        width: 6,
        height: 1,
      },
      exits: ["start", "eastRoom", "northAlcove"],
    },

    northAlcove: {
      id: "northAlcove",
      type: "special",
      bounds: {
        x: 6,
        y: 1,
        width: 2,
        height: 1,
      },
      exits: ["hallway"],
    },

    eastRoom: {
      id: "eastRoom",
      type: "room",
      bounds: {
        x: 10,
        y: 1,
        width: 4,
        height: 4,
      },
      exits: ["hallway", "bossRoom"],
    },

    bossRoom: {
      id: "bossRoom",
      type: "special",
      bounds: {
        x: 10,
        y: 6,
        width: 4,
        height: 4,
      },
      exits: ["eastRoom"],
    },
  },

  connections: [
    {
      id: "start-to-hallway",
      from: "start",
      to: "hallway",
      type: "door",
      portal: {
        x: 4,
        y: 2,
        direction: "west",
      },
    },
    {
      id: "next-door",
      from: "hallway",
      to: "alcove",
      type: "door",
      portal: {
        x: 8,
        y: 2,
        direction: "west",
      },
      requiredKey: "key_east-to-boss",
    },
    {
      id: "hallway-to-alcove",
      from: "hallway",
      to: "northAlcove",
      type: "open",
    },
    {
      id: "hallway-to-east",
      from: "hallway",
      to: "eastRoom",
      type: "open",
    },
    {
      id: "east-to-boss",
      from: "eastRoom",
      to: "bossRoom",
      type: "door",
      portal: {
        x: 10,
        y: 5,
        direction: "south",
      },
    },
  ],

  grid: dungeonFromAscii(`
################
#   #  #      ##
#             ##
#   #  #      ##
#####  #########
#####  #########
#####  #########     
#####  #########
#####          #
#####          #
################
`),
};

export function registerTestDungeon(reg: ContentRegistry) {
  reg.registerDungeon(testDungeon);
}
