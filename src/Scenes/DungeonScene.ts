// DungeonScene.ts
import { Scene, Label, vec, Color, toDegrees, Keys, Axes, Buttons, Engine, SceneActivationContext } from "excalibur";
import { StateStore } from "../GameState";
import { createDungeonCamera, DungeonCamera, DungeonDefinition, GameMode, GameState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";
import { Dungeon, DungeonManager } from "../Lib/Managers/DungeonManager";
import { DungeonViewport } from "../UI/DungeonViewport";
import { InputMapSystem } from "../Lib/Systems/InputMapper";
import { DungeonPlayer } from "../Actors/DungeonPlayer";
import { DungeonPlayerController } from "../Lib/Managers/DungeonPlayerController";
import { Minimap } from "../UI/Minimap";
import { InteractionSystem } from "../Lib/Systems/InteractionSystem";
import { InventorySystem } from "../Lib/Systems/InventorySystem";
import { INPUT_CONTEXT } from "../main";
import { EncounterTriggerSystem } from "../Lib/Systems/EncounterTrigger";
import { ProximitySystem } from "../Lib/Systems/ProxSystem";
import { DialogRunner } from "../Lib/Managers/DialogRunner";
import { DialogUI } from "../UI/DialogUI";
import { CutSceneSystem, CutsceneTriggerSystem } from "../Lib/Managers/CutScenes";
import { QuestManager } from "../Lib/Managers/QuestManager";
import { getLoadedTextures } from "../resources";

export class DungeonScene extends Scene {
  dCamera?: DungeonCamera;
  inventory?: InventorySystem;
  interactions?: InteractionSystem;
  d_Player?: DungeonPlayer;
  playerController?: DungeonPlayerController;
  proximitySystem!: ProximitySystem;
  encounterTriggerSystem!: EncounterTriggerSystem;
  dialogUI: DialogUI | null = null;
  dialogRunner: DialogRunner | null = null;
  tmpDialogLock: string = "idle";
  tmpTriggeredEncounter: any = null;
  private cutSceneSystem!: CutSceneSystem;
  private cutsceneTriggerSystem!: CutsceneTriggerSystem;
  questManager!: QuestManager;
  private dungeonManager = new DungeonManager();
  private dungeonDef!: DungeonDefinition;

  constructor(
    private readonly state: StateStore<GameState>,
    private readonly content: ContentRegistry,
    private readonly inputMapper: InputMapSystem,
  ) {
    super();
    this.dCamera = createDungeonCamera(2.5, 2.5);
  }

  public onInitialize(engine: Engine): void {
    this.inputMapper.registerMap({
      name: INPUT_CONTEXT.Dungeon,
      inputMap: {
        KeyPresses: new Set([Keys.W, Keys.S, Keys.A, Keys.D, Keys.E]),
        GamepadButtonsTriggers: new Set([
          Buttons.Face1,
          Buttons.Face2,
          Buttons.DpadUp,
          Buttons.DpadDown,
          Buttons.DpadLeft,
          Buttons.DpadRight,
        ]),
        GamepadAxesTriggers: new Set([Axes.LeftStickX, Axes.LeftStickY]),
      },
    });
    this.dialogUI = new DialogUI(this.inputMapper);
    this.encounterTriggerSystem = new EncounterTriggerSystem(this.state, this.content);

    // 🚀 Initialize QuestManager and load ALL quests dynamically from ContentRegistry
    this.questManager = new QuestManager(this.state);
    for (const [id, questDef] of this.content.quests.entries()) {
      this.questManager.registerQuestData(questDef);
    }

    // 🚀 Initialize Cutscenes and load ALL cutscenes dynamically from ContentRegistry
    this.cutSceneSystem = new CutSceneSystem(this.world, () => this.state, this.questManager);
    this.cutsceneTriggerSystem = new CutsceneTriggerSystem(this.state, this.cutSceneSystem);
    this.world.add(this.cutSceneSystem);
    this.cutSceneSystem.setDialogUI(this.dialogUI);
    this.cutSceneSystem.setEncounterTriggerSystem(this.encounterTriggerSystem);
    for (const [id, manifest] of this.content.cutscenes.entries()) {
      this.cutSceneSystem.registerCutScene(id, manifest);
    }

    const currentDungeonId = this.state.get("dungeon").current;
    const currentDungeon = this.state.get("dungeon").registry[currentDungeonId];
    const definition = this.content.getDungeon(currentDungeonId);
    if (!definition) {
      throw new Error(`Dungeon definition not found for ID: ${currentDungeonId}`);
    }

    this.dungeonManager.loadOrInitDungeon(definition, this.state, this.content);
    const dungeon = new Dungeon(definition, this.state);

    const vp = new DungeonViewport({
      dungeon: definition,
      getState: () => currentDungeon,
      camera: this.dCamera!,
      width: 960,
      height: 540,
      textures: getLoadedTextures(),
      content: this.content,
    });

    this.inventory = new InventorySystem(this.state, this.content);
    this.interactions = new InteractionSystem(this.state, this.dungeonManager, this.inventory, this.content, vp, this.questManager);
    this.d_Player = new DungeonPlayer(this.state, dungeon, this.dCamera!, this.interactions, vp);

    this.d_Player.onStepOrTurn = () => {
      this.handleTurnTick();
    };
    this.playerController = new DungeonPlayerController(this.inputMapper, this.d_Player);
    this.playerController.initialize();
    this.proximitySystem = new ProximitySystem(this.state, this.content);
  }

  public async onActivate(): Promise<void> {
    this.inputMapper.switchContext(INPUT_CONTEXT.Dungeon);

    const currentDungeonId = this.state.get("dungeon").current;
    const definition = this.content.getDungeon(currentDungeonId);
    if (!definition) {
      throw new Error(`Dungeon definition not found for ID: ${currentDungeonId}`);
    }
    this.dungeonDef = definition;
    this.dungeonManager = new DungeonManager();
    this.dungeonManager.loadOrInitDungeon(definition, this.state, this.content);
    const dungeon = new Dungeon(definition, this.state);

    const vp = new DungeonViewport({
      dungeon: definition,
      getState: () => {
        const currentDungeonId = this.state.get("dungeon").current;
        const currentDungeon = this.state.get("dungeon").registry[currentDungeonId];
        return currentDungeon;
      },
      camera: this.dCamera!,
      width: 960,
      height: 540,
      textures: getLoadedTextures(),
      content: this.content,
    });
    this.add(vp);

    const minimap = new Minimap({
      dungeon: definition,
      dungeonManager: dungeon,
      getState: () => {
        const currentDungeonId = this.state.get("dungeon").current;
        const currentDungeon = this.state.get("dungeon").registry[currentDungeonId];
        return currentDungeon;
      },
      camera: this.dCamera!,
      position: vec(16, 16),
      tileSize: 12,
    });
    this.add(minimap);

    this.inventory = new InventorySystem(this.state, this.content);
    this.interactions = new InteractionSystem(this.state, this.dungeonManager, this.inventory, this.content, vp, this.questManager);

    this.d_Player = new DungeonPlayer(this.state, dungeon, this.dCamera!, this.interactions, vp);
    this.d_Player.onStepOrTurn = () => {
      this.handleTurnTick();
    };
    if (!this.playerController) {
      this.playerController = new DungeonPlayerController(this.inputMapper, this.d_Player);
      this.playerController.initialize();
    } else {
      this.playerController.setPlayer(this.d_Player);
    }

    this.proximitySystem = new ProximitySystem(this.state, this.content);
    this.encounterTriggerSystem = new EncounterTriggerSystem(this.state, this.content);

    if (this.dungeonDef.onEnterCutsceneId) {
      const storyPoints = this.state.get("storypoints") || {};
      const flagKey = `dungeon_entered_${currentDungeonId}`;

      if (!storyPoints[flagKey]) {
        this.state.update("game", g => ({ ...g, mode: "paused" as GameMode }));
        await this.cutSceneSystem.startCutScene(this.dungeonDef.onEnterCutsceneId);
        this.state.update("game", g => ({ ...g, mode: "playing" as GameMode }));
        this.state.update("storypoints", points => ({
          ...points,
          [flagKey]: true,
        }));
      }
    }
  }

  public async onDeactivate(context: SceneActivationContext) {
    if (this.dungeonDef && this.dungeonDef.onExitCutsceneId) {
      this.state.update("game", g => ({ ...g, mode: "paused" as GameMode }));
      await this.cutSceneSystem.startCutScene(this.dungeonDef.onExitCutsceneId);
      this.state.update("game", g => ({ ...g, mode: "playing" as GameMode }));
    }
    this.clear();
  }

  private async handleTurnTick(): Promise<void> {
    if (this.state.get("game.mode") !== "playing") return;

    const triggered = await this.cutsceneTriggerSystem.checkTileTriggers(
      Math.floor(this.dCamera!.x),
      Math.floor(this.dCamera!.y),
      this.dungeonDef.cutsceneTriggers,
    );

    if (triggered) return;

    const { alertedEnemies, triggeredEncounter } = this.proximitySystem.updateProximity();
    if (triggeredEncounter) {
      this.cutSceneSystem.registerCutScene("goblin-encounter", {
        id: "goblin-encounter",
        commands: [
          {
            type: "dialog",
            args: { path: "/public/Dialog/goblin.json", scene: this, dialog: this.dialogUI },
          },
          {
            type: "encounter",
            args: { enemyInstanceId: triggeredEncounter },
          },
        ],
      });

      this.cutSceneSystem.startCutScene("goblin-encounter");
    }
  }

  onPreUpdate(engine: Engine, elapsed: number): void {
    const mode = this.state.get("game.mode");
    const encounter = this.state.get("game.encounter");

    let statusMsg =
      `POS ${this.dCamera!.x.toFixed(2)}, ${this.dCamera!.y.toFixed(2)} | MODE: ${mode}\n` +
      `ANGLE ${toDegrees(this.dCamera!.angle).toFixed(1)}°`;

    if (encounter) {
      statusMsg += `\n[ENCOUNTER]: Target ${encounter.activeEnemyInstanceId} | Turn: ${encounter.currentTurn}`;
    }
  }
}
