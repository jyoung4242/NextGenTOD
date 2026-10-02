import "./style.css";
import { Engine, DisplayMode, Label, vec, Color, toDegrees, Keys, Axes, Buttons } from "excalibur";
import { createInitialGameState, createStateStore, type StateStore } from "./GameState";
import { createDungeonCamera, type GameState } from "./GameTypes";
import { ContentRegistry } from "./Content/ContentRegistry";
import { registerTestDungeon, testDungeon } from "./Content/Dungeons/testDungeon";
import { applyConnectionsToGrid, createDungeonState, Dungeon, DungeonManager } from "./Lib/Managers/DungeonManager";
import { DungeonViewport } from "./UI/DungeonViewport";
import { InputMapSystem } from "./Lib/Systems/InputMapper";
import { DungeonPlayer } from "./Actors/DungeonPlayer";
import { DungeonPlayerController } from "./Lib/Managers/DungeonPlayerController";
import { Minimap } from "./UI/Minimap";
import { InteractionSystem } from "./Lib/Systems/InteractionSystem";
import { InventorySystem } from "./Lib/Systems/InventorySystem";
import { registerTestItems } from "./Content/Items/test-items";
import { registerTestEnemies } from "./Content/Enemies/test-enemies";
import { ProximitySystem } from "./Lib/Systems/ProxSystem";
import { EncounterTriggerSystem } from "./Lib/Systems/EncounterTriggerSystem";
import { EncounterScene } from "./Scenes/EncounterScene";
import { DungeonScene } from "./Scenes/DungeonScene";

export const INPUT_CONTEXT = {
  Dungeon: "dungeon",
  Encounter: "encounter",
  Menu: "menu",
  Pause: "pause",
} as const;

export const content = new ContentRegistry();
registerTestDungeon(content);
registerTestItems(content);
registerTestEnemies(content);

const definition = content.getDungeon("test-dungeon");
applyConnectionsToGrid(definition);

const initialGameState = createInitialGameState();
initialGameState.dungeon = createDungeonState(definition);

export const state: StateStore<GameState> = createStateStore(initialGameState);
export const inventory = new InventorySystem(state, content);

const game = new Engine({
  width: 960,
  height: 540,
  displayMode: DisplayMode.Fixed,
  pixelArt: true,
  scenes: {
    encounter: new EncounterScene(state, content),
    dungeon: new DungeonScene(state, content, definition),
  },
});

game.start();
game.goToScene("dungeon");
export const inputMapper = new InputMapSystem(game);
inputMapper.registerMap({
  name: INPUT_CONTEXT.Dungeon,
  inputMap: {
    KeyPresses: new Set([Keys.W, Keys.S, Keys.A, Keys.D, Keys.E]),
    GamepadButtonsTriggers: new Set([Buttons.Face1, Buttons.Face2]),
    GamepadAxesTriggers: new Set([Axes.LeftStickX, Axes.LeftStickY]),
  },
});
