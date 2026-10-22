// main.ts
import "./style.css";
import { Engine, DisplayMode } from "excalibur";
import { createInitialGameState, createStateStore, type StateStore } from "./GameState";
import { type GameState } from "./GameTypes";
import { ContentRegistry } from "./Content/ContentRegistry";
import { registerTestDungeon } from "./Content/Dungeons/testDungeon";
import { registerTestItems } from "./Content/Items/test-items";
import { registerTestEnemies } from "./Content/Enemies/test-enemies";

import { InputMapSystem } from "./Lib/Systems/InputMapper";
import { DungeonScene } from "./Scenes/DungeonScene";
import { EncounterScene } from "./Scenes/EncounterScene";
import { GameOverScene } from "./Scenes/GameOver";
import { loader } from "./resources";
import { registerQuest } from "./Content/Quests/testQuest";
import { registerSkills } from "./Content/Skills/SkillsRegistry";
import { applyConnectionsToGrid } from "./Lib/Managers/DungeonManager";
import { registerCutscenes } from "./Content/Cutscenes";

export const INPUT_CONTEXT = {
  Dungeon: "dungeon",
  Encounter: "encounter",
  Menu: "menu",
  Pause: "pause",
  Dialog: "dialog",
  Carousel: "carousel",
} as const;

export const SCENES = {
  Dungeon: "dungeon",
  Encounter: "encounter",
  GameOver: "gameover",
} as const;

export const content = new ContentRegistry();
registerTestDungeon(content);
registerTestItems(content);
registerTestEnemies(content);
registerQuest(content);
registerSkills(content);
registerCutscenes(content);

// Ensure grid connections are processed on the static definition content
const definition = content.getDungeon("test-dungeon");
if (definition) {
  applyConnectionsToGrid(definition);
}

// Initialize state store with default factory (which sets up the dungeon cache structure)
export const state: StateStore<GameState> = createStateStore(createInitialGameState());

const game = new Engine({
  width: 960,
  height: 540,
  displayMode: DisplayMode.Fixed,
  pixelArt: true,
});

export const inputMapper = new InputMapSystem(game);

// Register scenes
game.addScene(SCENES.Dungeon, new DungeonScene(state, content, inputMapper));
game.addScene(SCENES.Encounter, new EncounterScene(state, content, inputMapper));
game.addScene(SCENES.GameOver, new GameOverScene(state, content));

game.goToScene(SCENES.Dungeon);
await game.start(loader);

// Mode routing listener
state.subscribe("game.mode", payload => {
  if (payload.value === "encounter") {
    game.goToScene(SCENES.Encounter);
  } else if (payload.value === "playing") {
    game.goToScene(SCENES.Dungeon);
  } else if (payload.value === "game_over") {
    game.goToScene(SCENES.GameOver);
  }
});
