// Content/Dungeons/farmExterior.ts
import { DungeonDefinition, dungeonFromAscii } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const farmExterior: DungeonDefinition = {
  id: "farm-exterior",
  defaultWallTexture: "fence_wood",
  defaultFloorTexture: "grass",
  defaultCeilingTexture: "sky",
  onEnterCutsceneId: "farm-intro",

  items: [
    {
      id: "potion_health_minor",
      position: { x: 6, y: 12 },
      quantity: 1,
    },
  ],

  cutsceneTriggers: [
    {
      id: "enterCellarTrigger",
      cutsceneId: "enter-cellar",
      position: { x: 8, y: 9 },
      triggerType: "tile_enter",
    },
    {
      id: "enterCaveTrigger",
      cutsceneId: "enter-cave",
      position: { x: 24, y: 3 },
      triggerType: "tile_enter",
    },
  ],

  nodes: {
    farmhouseYard: {
      id: "farmhouseYard",
      type: "entrance",
      bounds: {
        x: 4,
        y: 6,
        width: 8,
        height: 7,
      },
      exits: ["farmhouseInterior", "homesteadPath", "cellarEntry"],
    },

    farmhouseInterior: {
      id: "farmhouseInterior",
      type: "room",
      bounds: {
        x: 5,
        y: 7,
        width: 4,
        height: 3,
      },
      exits: ["farmhouseYard"],
    },

    cellarEntry: {
      id: "cellarEntry",
      type: "special",
      bounds: {
        x: 8,
        y: 9,
        width: 2,
        height: 2,
      },
      exits: ["farmhouseYard"],
    },

    homesteadPath: {
      id: "homesteadPath",
      type: "corridor",
      bounds: {
        x: 12,
        y: 8,
        width: 10,
        height: 4,
      },
      exits: ["farmhouseYard", "millArea", "caveApproach"],
    },

    millArea: {
      id: "millArea",
      type: "room",
      bounds: {
        x: 22,
        y: 9,
        width: 6,
        height: 5,
      },
      exits: ["homesteadPath"],
    },

    caveApproach: {
      id: "caveApproach",
      type: "special",
      bounds: {
        x: 21,
        y: 2,
        width: 6,
        height: 5,
      },
      exits: ["homesteadPath"],
    },
  },

  connections: [
    {
      id: "yard-to-farmhouse",
      from: "farmhouseYard",
      to: "farmhouseInterior",
      type: "door",
      portal: {
        x: 7,
        y: 9,
        direction: "north",
      },
      skipRaycast: true,
      closedTexture: "door",
      openTexture: "door_open",
    },
    {
      id: "yard-to-homestead",
      from: "farmhouseYard",
      to: "homesteadPath",
      type: "open",
    },
    {
      id: "yard-to-cellar",
      from: "farmhouseYard",
      to: "cellarEntry",
      type: "open",
    },
    {
      id: "path-to-mill",
      from: "homesteadPath",
      to: "millArea",
      type: "open",
    },
    {
      id: "path-to-cave",
      from: "homesteadPath",
      to: "caveApproach",
      type: "open",
    },
  ],

  lighting: {
    ambientLight: 0.9,
    maxLightingDistance: 16,
    lights: [
      {
        x: 24.0,
        y: 3.0,
        radius: 4.5,
        color: "#ff9944",
        intensity: 0.7,
        flicker: {
          enabled: true,
          speed: 6.0,
          intensity: 0.1,
        },
      },
    ],
  },

  grid: dungeonFromAscii(
    `
############################
#                    ####t##
#                    #    p#
#                    #     #
#                    ### ###
#                      #   #
#    #####             #   #
#    #   #                 #
#    #   #                 #
#    ##d##        ######   #
#                 #    #   #
#                 #    #   #
#                 #    #   #
#                 ######   #
############################
`,
    {
      wallMaterialId: "fence_wood",
      tileMap: {
        d: [
          { textureKey: "wood_panel", alpha: 1.0 },
          { textureKey: "door", alpha: 1.0, blendMode: "source-over" },
        ],
        p: [
          { textureKey: "stone", alpha: 1.0 },
          { textureKey: "portaliso", alpha: 0.9, blendMode: "source-over" },
        ],
        t: [
          { textureKey: "stone", alpha: 1.0 },
          {
            textureKey: "torch",
            alpha: 1.0,
            blendMode: "source-over",
            animation: {
              frameCount: 4,
              fps: 8,
              frameWidth: 128,
              frameHeight: 128,
            },
          },
        ],
      },
    },
  ),
};

export function registerFarmExterior(reg: ContentRegistry) {
  reg.registerDungeon(farmExterior);
}
