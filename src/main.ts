import "./style.css";
import { Engine, DisplayMode } from "excalibur";
import { createInitialGameState, createStateStore, type StateStore } from "./GameState";
import { type GameState } from "./GameTypes";
import { ContentRegistry } from "./Content/ContentRegistry";
import { registerTestDungeon } from "./Content/Dungeons/testDungeon";
import { registerTestItems } from "./Content/Items/test-items";
import { registerTestEnemies } from "./Content/Enemies/test-enemies";
import { applyConnectionsToGrid, createDungeonState } from "./Lib/Managers/DungeonManager";
import { InputMapSystem } from "./Lib/Systems/InputMapper";
import { DungeonScene } from "./Scenes/DungeonScene";

export const INPUT_CONTEXT = {
  Dungeon: "dungeon",
  Encounter: "encounter",
  Menu: "menu",
  Pause: "pause",
} as const;

export const SCENES = {
  Dungeon: "dungeon",
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
registerTestEnemies(content);

// 1. Prepare dungeon definition & connection grid
const definition = content.getDungeon("test-dungeon");
applyConnectionsToGrid(definition);

// 2. Hydrate initial state (Exact original setup)
const initialGameState = createInitialGameState();
initialGameState.dungeon = createDungeonState(definition);

export const state: StateStore<GameState> = createStateStore(initialGameState);

export const inputMapper = new InputMapSystem(game);

// 3. Register scenes
game.addScene(SCENES.Dungeon, new DungeonScene(state, content, inputMapper));

game.goToScene(SCENES.Dungeon);
game.start();
