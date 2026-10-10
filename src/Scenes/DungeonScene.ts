import { Scene, Label, vec, Color, toDegrees, Keys, Axes, Buttons, Engine, SceneActivationContext } from "excalibur";
import { StateStore } from "../GameState";
import { createDungeonCamera, DungeonCamera, GameState } from "../GameTypes";
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
import { DialogLoader } from "../Lib/Managers/DialogLoader";
import { CutSceneSystem } from "../Lib/Managers/CutScenes";
import { QuestManager } from "../Lib/Managers/QuestManager";

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
  questManager!: QuestManager;

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
    this.encounterTriggerSystem = new EncounterTriggerSystem(this.state);
    // Initialize CutSceneSystem
    this.cutSceneSystem = new CutSceneSystem(this.world);
    this.world.add(this.cutSceneSystem);
    this.cutSceneSystem.setDialogUI(this.dialogUI);
    this.cutSceneSystem.setEncounterTriggerSystem(this.encounterTriggerSystem);
    // Register Cutscenes
    this.cutSceneSystem.registerCutScene("dungeon-intro", {
      id: "dungeon-intro",
      commands: [
        {
          type: "dialog",
          args: { path: "/public/Dialog/dungeon-intro.json", scene: this, dialog: this.dialogUI },
        },
      ],
    });
    // Inside DungeonScene.ts -> onInitialize()

    this.cutSceneSystem.registerCutScene("goblin-encounter", {
      id: "goblin-encounter",
      commands: [
        {
          type: "dialog",
          args: { path: "/public/Dialog/goblin.json" },
        },
        {
          type: "encounter",
          args: { enemyInstanceId: "goblin-1" }, // Or dynamic argument passed at runtime
        },
      ],
    });
    // this.dialogRunner = new DialogRunner(this.dialogUI, new DialogLoader("/public/Dialog/dungeon-intro.json")); //public\Dialog\testDialog.json
    this.cutSceneSystem.startCutScene("dungeon-intro");

    this.questManager = new QuestManager(this.state);
    const potionQuest = this.content.getQuest("find-potion");
    this.questManager.registerQuestData(potionQuest);

    const definition = this.content.getDungeon("test-dungeon");

    const dungeon = new Dungeon(definition, this.state);
    const dungeonManager = new DungeonManager();
    dungeonManager.loadDungeon(definition, this.state);

    const vp = new DungeonViewport({
      dungeon: definition,
      getState: () => this.state.get("dungeon"),
      camera: this.dCamera!,
      width: 960,
      height: 540,
    });

    this.inventory = new InventorySystem(this.state, this.content);
    this.interactions = new InteractionSystem(this.state, dungeonManager, this.inventory, this.content, this.questManager);
    this.d_Player = new DungeonPlayer(this.state, dungeon, this.dCamera!, this.interactions);
    // 2. Attach turn/step callback to evaluate enemy proximity & trigger encounters
    this.d_Player.onStepOrTurn = () => {
      this.handleTurnTick();
    };
    this.playerController = new DungeonPlayerController(this.inputMapper, this.d_Player);
    this.playerController.initialize();

    this.proximitySystem = new ProximitySystem(this.state, this.content);
  }

  public onActivate(): void {
    this.inputMapper.switchContext(INPUT_CONTEXT.Dungeon);
    const definition = this.content.getDungeon("test-dungeon");

    const dungeon = new Dungeon(definition, this.state);
    const dungeonManager = new DungeonManager();
    dungeonManager.loadDungeon(definition, this.state);
    const vp = new DungeonViewport({
      dungeon: definition,
      getState: () => this.state.get("dungeon"),
      camera: this.dCamera!,
      width: 960,
      height: 540,
    });
    this.add(vp);

    const minimap = new Minimap({
      dungeon: definition,
      dungeonManager: dungeon,
      getState: () => this.state.get("dungeon"),
      camera: this.dCamera!,
      position: vec(16, 16),
      tileSize: 12,
    });
    this.add(minimap);

    this.inventory = new InventorySystem(this.state, this.content);
    this.interactions = new InteractionSystem(this.state, dungeonManager, this.inventory, this.content);

    this.d_Player = new DungeonPlayer(this.state, dungeon, this.dCamera!, this.interactions);
    // 2. Attach turn/step callback to evaluate enemy proximity & trigger encounters
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
    this.encounterTriggerSystem = new EncounterTriggerSystem(this.state);
    if (this.dialogUI) {
      this.add(this.dialogUI);
      this.dialogRunner?.start();
      console.log("Dialog UI added and started.", this.dialogUI);
    }
    this.questManager.startQuest("find-potion");
    console.log("Active Quests:", this.state.get("quests.active"));
  }

  public onDeactivate(context: SceneActivationContext) {
    this.clear();
  }

  private handleTurnTick(): void {
    // Only check proximity if currently in playing mode
    if (this.state.get("game.mode") !== "playing") return;

    // Evaluate enemy distances and alert states
    const { alertedEnemies, triggeredEncounter } = this.proximitySystem.updateProximity();
    // If an enemy is in immediate contact range, initiate combat encounter
    if (triggeredEncounter) {
      // Dynamic Cutscene Registration with Dialogue & Encounter Actions
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
