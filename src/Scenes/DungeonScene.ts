import { Scene, Label, vec, Color, toDegrees, Keys, Axes, Buttons, Engine } from "excalibur";
import { StateStore } from "../GameState";
import { createDungeonCamera, GameState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";
import { applyConnectionsToGrid, createDungeonState, Dungeon, DungeonManager } from "../Lib/Managers/DungeonManager";
import { DungeonViewport } from "../UI/DungeonViewport";
import { InputMapSystem } from "../Lib/Systems/InputMapper";
import { DungeonPlayer } from "../Actors/DungeonPlayer";
import { DungeonPlayerController } from "../Lib/Managers/DungeonPlayerController";
import { Minimap } from "../UI/Minimap";
import { InteractionSystem } from "../Lib/Systems/InteractionSystem";
import { InventorySystem } from "../Lib/Systems/InventorySystem";

export const INPUT_CONTEXT = {
  Dungeon: "dungeon",
  Encounter: "encounter",
  Menu: "menu",
  Pause: "pause",
} as const;

export class DungeonScene extends Scene {
  private debugText!: Label;

  constructor(
    private readonly state: StateStore<GameState>,
    private readonly content: ContentRegistry,
    private readonly inputMapper: InputMapSystem,
  ) {
    super();
  }

  public onInitialize(engine: Engine): void {
    const definition = this.content.getDungeon("test-dungeon");
    applyConnectionsToGrid(definition);

    // Initialize state
    this.state.update(s => {
      s.dungeon = createDungeonState(definition);
    });

    const dungeon = new Dungeon(definition, this.state);
    const dungeonManager = new DungeonManager();
    dungeonManager.loadDungeon(definition, this.state);

    const camera = createDungeonCamera(2.5, 2.5);

    // Viewport & Minimap
    const vp = new DungeonViewport({
      dungeon: definition,
      getState: () => this.state.get("dungeon"),
      camera,
      width: 960,
      height: 540,
    });
    this.add(vp);

    const minimap = new Minimap({
      dungeon: definition,
      dungeonManager: dungeon,
      getState: () => this.state.get("dungeon"),
      camera,
      position: vec(16, 16),
      tileSize: 12,
    });
    this.add(minimap);

    // Debug Label
    this.debugText = new Label({
      text: "",
      pos: vec(10, 10),
      color: Color.White,
    });
    this.add(this.debugText);

    // Register Dungeon Input Context on the shared InputMapSystem
    this.inputMapper.registerMap({
      name: INPUT_CONTEXT.Dungeon,
      inputMap: {
        KeyPresses: new Set([Keys.W, Keys.S, Keys.A, Keys.D, Keys.E]),
        GamepadButtonsTriggers: new Set([Buttons.Face1, Buttons.Face2]),
        GamepadAxesTriggers: new Set([Axes.LeftStickX, Axes.LeftStickY]),
      },
    });

    // Subsystems & Player
    const inventory = new InventorySystem(this.state, this.content);
    const interactions = new InteractionSystem(this.state, dungeonManager, inventory, this.content);

    const d_Player = new DungeonPlayer(this.state, dungeon, camera, interactions);
    const playerController = new DungeonPlayerController(this.inputMapper, d_Player);
    playerController.initialize();

    this.on("preupdate", () => {
      this.debugText.text = `POS ${camera.x.toFixed(2)}, ${camera.y.toFixed(2)}\n` + `ANGLE ${toDegrees(camera.angle).toFixed(1)}`;
    });
  }

  public onActivate(): void {
    // When transitioning into DungeonScene, switch active input context
    this.inputMapper.switchContext(INPUT_CONTEXT.Dungeon);
  }
}
