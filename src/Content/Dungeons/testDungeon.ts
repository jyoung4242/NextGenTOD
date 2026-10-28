import { DungeonDefinition, dungeonFromAscii } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";
import { cryptDungeon } from "./cryptDungeon";

export const testDungeon: DungeonDefinition = {
  id: "test-dungeon",
  defaultWallTexture: "stone",
  defaultFloorTexture: "dirt",
  defaultCeilingTexture: "ceiling",
  onEnterCutsceneId: "dungeon-intro", //commented out for debug of encounter
  items: [
    {
      id: "alcove-key",
      keyId: "key_east-to-boss",
      position: { x: 6, y: 1 }, // Located inside northAlcove
      quantity: 1,
    },
    {
      id: "potion_health_minor",
      position: { x: 12, y: 8 }, // Located in the hallway near entrance
      quantity: 2,
    },
  ],
  enemies: [
    {
      id: "enemy_hallway_1",
      definitionId: "goblin",
      position: { x: 12, y: 2 },
    },
    {
      id: "enemy_hallway_2",
      definitionId: "goblin",
      position: { x: 13, y: 1 },
    },
    // {
    //   id: "enemy_east_room_1",
    //   definitionId: "skeleton_warrior",
    //   position: { x: 11, y: 2 },
    // },
  ],
  lighting: {
    ambientLight: 0.2, // Base ambient brightness so walls are faintly visible
    maxLightingDistance: 2, // Distance where walls fade completely into shadow
    lights: [
      {
        x: 1,
        y: 1,
        radius: 3.0,
        color: "#ff8833", // Warm torch glow near start
        intensity: 0.4,
        flicker: {
          enabled: true,
          speed: 8.0,
          intensity: 0.08,
        },
      },
      {
        x: 6,
        y: 2,
        radius: 2.0,
        color: "#ff8833", // Warm torch glow near start
        intensity: 1.0,
        flicker: {
          enabled: true,
          speed: 5.0,
          intensity: 0.12,
        },
      },
      {
        x: 13,
        y: 1,
        radius: 3.0,
        color: "#ff8833", // Warm torch glow near start
        intensity: 0.5,
        flicker: {
          enabled: true,
          speed: 5.0,
          intensity: 0.12,
        },
      },
      {
        x: 13,
        y: 4,
        radius: 3.0,
        color: "#ff8833", // Warm torch glow near start
        intensity: 0.5,
        flicker: {
          enabled: true,
          speed: 5.0,
          intensity: 0.12,
        },
      },
      {
        x: 5,
        y: 12,
        radius: 3.0,
        color: "#ff8833", // Warm torch glow near start
        intensity: 0.5,
        flicker: {
          enabled: true,
          speed: 5.0,
          intensity: 0.12,
        },
      },
      {
        x: 12.0,
        y: 8.0,
        radius: 5.0,
        color: "#ffaa44", // Torch near the boss room entrance
        intensity: 0.5,
        flicker: {
          enabled: true,
          speed: 7.5,
          intensity: 0.1,
        },
      },
    ],
  },
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
  cutsceneTriggers: [
    {
      id: "goToCrypt",
      cutsceneId: "enter-crypt",
      position: { x: 14, y: 9 },
      triggerType: "tile_enter",
    },
    {
      id: "goblinThreat",
      cutsceneId: "goblin-encounter-cutscene",
      triggerType: "encounter_start",
      targetId: "enemy_hallway_1",
    },
  ],

  grid: dungeonFromAscii(
    `
#t###t##########
#   #  #      t#
#             ##
#   #  #      t#
#####  #########
#####  #########
#####  #########     
#####  ######t##
#####         ##
####t          p
################
`,
    {
      tileMap: {
        p: [
          { textureKey: "stone", alpha: 1.0 },
          { textureKey: "portaliso", alpha: 0.9, blendMode: "source-over" },
        ],
        t: [
          { textureKey: "stone", alpha: 1.0 },
          {
            textureKey: "torch", // Corresponds to Resources.torchSS in resources.ts
            alpha: 1.0,
            blendMode: "source-over", // Transparently blends black background pixels around the flame
            animation: {
              frameCount: 4, // Adjust to match your torch sprite strip layout (e.g., 4 horizontal frames)
              fps: 8, // Animation playback speed
              frameWidth: 128, // Pixel width of a single frame in torch.png
              frameHeight: 128, // Pixel height of the frame
            },
          },
        ],
      },
    },
  ),
};

export function registerTestDungeon(reg: ContentRegistry) {
  reg.registerDungeon(testDungeon);
  reg.registerDungeon(cryptDungeon);
}
