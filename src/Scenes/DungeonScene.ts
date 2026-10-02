import { Scene, Label, vec, Color, toDegrees, Keys, Axes, Buttons, Engine } from "excalibur";
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

export class DungeonScene extends Scene {
  dCamera?: DungeonCamera;
  inventory?: InventorySystem;
  interactions?: InteractionSystem;
  d_Player?: DungeonPlayer;
  playerController?: DungeonPlayerController;
  proximitySystem!: ProximitySystem;
  encounterTriggerSystem!: EncounterTriggerSystem;

  constructor(
    private readonly state: StateStore<GameState>,
    private readonly content: ContentRegistry,
    private readonly inputMapper: InputMapSystem,
  ) {
    super();
    this.dCamera = createDungeonCamera(2.5, 2.5);
  }

  public onInitialize(engine: Engine): void {
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

    this.inputMapper.registerMap({
      name: INPUT_CONTEXT.Dungeon,
      inputMap: {
        KeyPresses: new Set([Keys.W, Keys.S, Keys.A, Keys.D, Keys.E]),
        GamepadButtonsTriggers: new Set([Buttons.Face1, Buttons.Face2]),
        GamepadAxesTriggers: new Set([Axes.LeftStickX, Axes.LeftStickY]),
      },
    });

    this.inventory = new InventorySystem(this.state, this.content);
    this.interactions = new InteractionSystem(this.state, dungeonManager, this.inventory, this.content);

    this.d_Player = new DungeonPlayer(this.state, dungeon, this.dCamera!, this.interactions);
    // 2. Attach turn/step callback to evaluate enemy proximity & trigger encounters
    this.d_Player.onStepOrTurn = () => {
      this.handleTurnTick();
    };
    this.playerController = new DungeonPlayerController(this.inputMapper, this.d_Player);
    this.playerController.initialize();

    this.proximitySystem = new ProximitySystem(this.state, this.content);
    this.encounterTriggerSystem = new EncounterTriggerSystem(this.state);
  }

  public onActivate(): void {
    this.inputMapper.switchContext(INPUT_CONTEXT.Dungeon);
  }

  private handleTurnTick(): void {
    // Only check proximity if currently in playing mode
    if (this.state.get("game.mode") !== "playing") return;

    // Evaluate enemy distances and alert states
    const { alertedEnemies, triggeredEncounter } = this.proximitySystem.updateProximity();
    console.log("alertedEnemies:", alertedEnemies, "triggeredEncounter:", triggeredEncounter);
    // If an enemy is in immediate contact range, initiate combat encounter
    if (triggeredEncounter) {
      this.encounterTriggerSystem.checkAndTriggerEncounter(triggeredEncounter);
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
