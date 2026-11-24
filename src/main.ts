// main.ts
import "./style.css";
import { Engine, DisplayMode, Color } from "excalibur";
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
import { registerSpells } from "./Content/Magic/spellRegistry";
import { CharacterCreationScene } from "./Scenes/PlayerCreation";
import { registerFarmNpcs } from "./Content/NPCs/Farmer";
import { titleEvents, TitleScene } from "./Scenes/Title";
import { SaveManager } from "./Lib/Managers/SaveLoadManager";

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
  TitleScene: "title",
  PlayerCreation: "playercreation",
} as const;

export const content = new ContentRegistry();
registerTestDungeon(content);
registerTestItems(content);
registerTestEnemies(content);
registerQuest(content);
registerSkills(content);
registerCutscenes(content);
registerSpells(content);
registerFarmNpcs(content);

// Ensure grid connections are processed on the static definition content
// const definition = content.getDungeon("farmhouse");
// if (definition) {
//   applyConnectionsToGrid(definition);
// }

// Initialize state store with default factory (which sets up the dungeon cache structure)
export const state: StateStore<GameState> = createStateStore(createInitialGameState());
const saves = new SaveManager(state, { keyPrefix: "into-the-unknown:save:" });

const game = new Engine({
  width: 960,
  height: 540,
  displayMode: DisplayMode.Fixed,
  pixelArt: true,
  fixedUpdateFps: 20,
  backgroundColor: Color.fromHex("#222222"),
});

export const inputMapper = new InputMapSystem(game);

let title = new TitleScene({ saves: saves });

// Register scenes
game.addScene(SCENES.Dungeon, new DungeonScene(state, content, inputMapper));
game.addScene(SCENES.Encounter, new EncounterScene(state, content, inputMapper));
game.addScene(SCENES.GameOver, new GameOverScene(state, content));
game.addScene(SCENES.PlayerCreation, new CharacterCreationScene(state, content, inputMapper));
game.addScene(SCENES.TitleScene, title); // Placeholder for title scene

saves.attachEngine(game);
game.goToScene(SCENES.TitleScene); // Start at title scene
await game.start(loader);

// Mode routing listener
state.subscribe("game.mode", payload => {
  if (payload.value === "encounter") {
    game.goToScene(SCENES.Encounter);
  } else if (payload.value === "playing") {
    game.goToScene(SCENES.Dungeon);
  } else if (payload.value === "game_over") {
    game.goToScene(SCENES.GameOver);
  } else if (payload.value === "playercreation") {
    game.goToScene(SCENES.PlayerCreation);
  } else if (payload.value === "title") {
    game.goToScene(SCENES.TitleScene);
  }
});

function registerNPCs(content: ContentRegistry) {
  throw new Error("Function not implemented.");
}

// Keep Load Game enabled/disabled state in sync whenever returning to TitleScene
const originalActivate = title.onActivate.bind(title);
title.onActivate = () => {
  title.setSaves(saves);
  console.log("TitleScene activated, saves:", saves.list());
  originalActivate();
};

titleEvents.on("newGame", async () => {
  // Replace with your fresh state + starting scene key
  state.batch(ctx => {
    ctx.set("game.mode", "playercreation");
  });
});

// Handle Load Game from the modal
titleEvents.on("loadGame", async ({ slotId }) => {
  const result = await saves.loadAndGo(game, slotId, "dungeon");
  if (!result.ok) {
    console.warn(`[Title] Failed to load slot "${slotId}": ${result.error}`);
    // Refresh list in case a save was corrupted or removed
    title.setSaves(saves);
  }
});
