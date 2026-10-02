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
import { EncounterScene } from "./Scenes/EncounterScene";

export const INPUT_CONTEXT = {
  Dungeon: "dungeon",
  Encounter: "encounter",
  Menu: "menu",
  Pause: "pause",
} as const;

export const SCENES = {
  Dungeon: "dungeon",
  Encounter: "encounter",
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
const game = new Engine({
  width: 960,
  height: 540,
  displayMode: DisplayMode.Fixed,
  pixelArt: true,
});

export const inputMapper = new InputMapSystem(game);

// 3. Register scenes
game.addScene(SCENES.Dungeon, new DungeonScene(state, content, inputMapper));
game.addScene(SCENES.Encounter, new EncounterScene(state, content, inputMapper));

game.goToScene(SCENES.Dungeon);
game.start();

// main.ts
state.subscribe("game.mode", payload => {
  if (payload.value === "encounter") {
    game.goToScene(SCENES.Encounter);
  } else if (payload.value === "playing") {
    game.goToScene(SCENES.Dungeon);
  }
});
