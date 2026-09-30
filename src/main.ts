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

export const INPUT_CONTEXT = {
  Dungeon: "dungeon",
  Encounter: "encounter",
  Menu: "menu",
  Pause: "pause",
} as const;

const game = new Engine({
  width: 960,
  height: 540,
  displayMode: DisplayMode.Fixed,
  pixelArt: true,
});

export const content = new ContentRegistry();
registerTestDungeon(content);
registerTestItems(content);
const definition = content.getDungeon("test-dungeon");
applyConnectionsToGrid(definition);

const initialGameState = createInitialGameState();
initialGameState.dungeon = createDungeonState(definition);

export const state: StateStore<GameState> = createStateStore(initialGameState);

const dungeon = new Dungeon(definition, state);
const dungeonManager = new DungeonManager();
dungeonManager.loadDungeon(definition, state);

game.start();

const camera = createDungeonCamera(2.5, 2.5);
const vp = new DungeonViewport({
  dungeon: definition,
  getState: () => state.get("dungeon"),
  camera,
  width: 960,
  height: 540,
});
game.add(vp);

const minimap = new Minimap({
  dungeon: definition,
  dungeonManager: dungeon,
  getState: () => state.get("dungeon"), // Dynamically feeds live door states
  camera,
  position: vec(16, 16),
  tileSize: 12,
});

game.add(minimap);
game.add(vp);
game.on("preupdate", _event => {
  debugText.text = `POS ${camera.x.toFixed(2)}, ${camera.y.toFixed(2)}\n` + `ANGLE ${toDegrees(camera.angle)}`;
});

const debugText = new Label({
  text: "",
  pos: vec(10, 10),
  color: Color.White,
});

game.add(debugText);

const inputMapper = new InputMapSystem(game);

inputMapper.registerMap({
  name: INPUT_CONTEXT.Dungeon,
  inputMap: {
    KeyPresses: new Set([Keys.W, Keys.S, Keys.A, Keys.D, Keys.E]),
    GamepadButtonsTriggers: new Set([Buttons.Face1, Buttons.Face2]),
    GamepadAxesTriggers: new Set([Axes.LeftStickX, Axes.LeftStickY]),
  },
});

const inventory = new InventorySystem(state, content);
const interactions = new InteractionSystem(state, dungeonManager, inventory, content);

const d_Player = new DungeonPlayer(state, dungeon, camera, interactions);
// Wire up controller directly
const playerController = new DungeonPlayerController(inputMapper, d_Player);
playerController.initialize();
inputMapper.switchContext(INPUT_CONTEXT.Dungeon);
