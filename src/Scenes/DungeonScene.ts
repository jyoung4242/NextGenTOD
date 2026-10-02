import { Camera, Color, Engine, Label, Scene, SceneActivationContext, toDegrees, vec } from "excalibur";
import { ContentRegistry } from "../Content/ContentRegistry";
import { StateStore } from "../GameState";
import { camera, createDungeonCamera, DungeonCamera, DungeonDefinition, GameState } from "../GameTypes";
import { Dungeon, DungeonManager } from "../Lib/Managers/DungeonManager";
import { DungeonViewport } from "../UI/DungeonViewport";
import { Minimap } from "../UI/Minimap";
import { DungeonPlayer } from "../Actors/DungeonPlayer";
import { DungeonPlayerController } from "../Lib/Managers/DungeonPlayerController";
import { EncounterTriggerSystem } from "../Lib/Systems/EncounterTriggerSystem";
import { InteractionSystem } from "../Lib/Systems/InteractionSystem";
import { InventorySystem } from "../Lib/Systems/InventorySystem";
import { ProximitySystem } from "../Lib/Systems/ProxSystem";
import { state, content, inputMapper, INPUT_CONTEXT, inventory } from "../main";

export class DungeonScene extends Scene {
  dm: DungeonManager;
  dcamera: DungeonCamera;
  vp: DungeonViewport;
  mm: Minimap;
  dungeon: Dungeon;
  debugText: Label | null = null;
  d_Player: DungeonPlayer;
  playerController: DungeonPlayerController | null = null;
  interactions: InteractionSystem;
  prox: ProximitySystem;
  encounters: EncounterTriggerSystem;

  constructor(
    private readonly store: StateStore<GameState>,
    private readonly contentRegistry: ContentRegistry,
    private readonly dungeonDef: DungeonDefinition,
  ) {
    super();
    this.dm = new DungeonManager();
    this.dcamera = createDungeonCamera(2.5, 2.5);
    this.vp = new DungeonViewport({
      dungeon: this.dungeonDef,
      getState: () => this.store.get("dungeon"),
      camera: this.dcamera,
      width: 960,
      height: 540,
    });
    this.dungeon = new Dungeon(this.dungeonDef, this.store);

    this.mm = new Minimap({
      dungeon: this.dungeonDef,
      dungeonManager: this.dungeon,
      getState: () => this.store.get("dungeon"), // Dynamically feeds live door states
      camera: this.dcamera,
      position: vec(16, 16),
      tileSize: 12,
    });
    this.interactions = new InteractionSystem(state, this.dm, inventory, content);
    this.prox = new ProximitySystem(state, content);
    this.encounters = new EncounterTriggerSystem(state);

    this.d_Player = new DungeonPlayer(state, this.dungeon, camera, this.interactions, this.prox, this.encounters);
  }

  onInitialize(engine: Engine): void {
    this.dm.loadDungeon(this.dungeonDef, this.store);
    this.debugText = new Label({
      text: "",
      pos: vec(10, 10),
      color: Color.White,
    });

    this.add(this.vp);
    this.add(this.mm);
    this.add(this.debugText);
    // Wire up controller directly
    inputMapper.switchContext(INPUT_CONTEXT.Dungeon);
    this.playerController = new DungeonPlayerController(inputMapper, this.d_Player);
    this.playerController.initialize();
  }

  onActivate(context: SceneActivationContext<unknown, undefined>): void {
    inputMapper.switchContext(INPUT_CONTEXT.Dungeon);
  }

  onDeactivate(context: SceneActivationContext) {}

  onPreUpdate(engine: Engine, elapsed: number): void {
    this.debugText!.text = `POS ${camera.x.toFixed(2)}, ${camera.y.toFixed(2)}\n` + `ANGLE ${toDegrees(camera.angle)}`;
  }
}
