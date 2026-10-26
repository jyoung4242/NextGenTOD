import { DungeonDefinition, dungeonFromAscii } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const cryptDungeon: DungeonDefinition = {
  id: "crypt-dungeon",
  defaultWallTexture: "stone",
  defaultFloorTexture: "dirt",
  defaultCeilingTexture: "ceiling",
  items: [
    {
      id: "potion_health_minor",
      position: { x: 5, y: 7 }, // Located in the southern crypt room
      quantity: 1,
    },
  ],
  cutsceneTriggers: [
    {
      id: "goblinThreat2",
      cutsceneId: "goblin-encounter-cutscene",
      triggerType: "encounter_start",
      targetId: "enemy_hallway_3",
    },
  ],
  enemies: [
    {
      id: "enemy_hallway_3",
      definitionId: "goblin",
      position: { x: 7, y: 3 },
    },
  ],
  nodes: {
    start: {
      id: "start",
      type: "entrance",
      bounds: {
        x: 6,
        y: 9,
        width: 3,
        height: 2,
      },
      exits: ["mainHall"],
    },

    mainHall: {
      id: "mainHall",
      type: "room",
      bounds: {
        x: 5,
        y: 5,
        width: 5,
        height: 4,
      },
      exits: ["start", "innerCrypt"],
    },

    innerCrypt: {
      id: "innerCrypt",
      type: "special",
      bounds: {
        x: 5,
        y: 2,
        width: 5,
        height: 3,
      },
      exits: ["mainHall"],
    },
  },

  connections: [
    {
      id: "start-to-mainHall",
      from: "start",
      to: "mainHall",
      type: "open",
    },
    {
      id: "hall-to-crypt",
      from: "mainHall",
      to: "innerCrypt",
      type: "door",
      portal: {
        x: 7,
        y: 4,
        direction: "north",
      },
    },
  ],

  grid: dungeonFromAscii(`
###############
######   ######
######   ######
######   ######
######   ######
#####     #####
#####     #####
#####     #####
#####     #####
######   ######
######   ######
###############
`),
};

export function registerCryptDungeon(reg: ContentRegistry) {
  reg.registerDungeon(cryptDungeon);
}
