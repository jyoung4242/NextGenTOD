// Scenes/EncounterScene.ts
import { Scene, Actor, Color, vec, Axes, Buttons, Keys } from "excalibur";
import { StateStore } from "../GameState";
import { GameState, CombatAction, EnemyState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";
import { DungeonGridRenderer } from "../UI/DungeonGridRenderer";
import { INPUT_CONTEXT } from "../main";
import { InputMapSystem } from "../Lib/Systems/InputMapper";
import { ActionQueueManager } from "../Lib/Managers/ActionQueueManager";
import { CombatStateMachine } from "../Lib/Systems/CombatStateMachine";

export class EncounterScene extends Scene {
  private playerActor?: Actor;
  private enemyActors: Map<string, Actor> = new Map();
  public gridRenderer?: DungeonGridRenderer;
  private readonly TILE_SIZE = 48;

  private stateMachine!: CombatStateMachine;
  public queueManager!: ActionQueueManager;

  constructor(
    private readonly store: StateStore<GameState>,
    private readonly contentRegistry: ContentRegistry,
    private readonly inputMapper: InputMapSystem,
  ) {
    super();
  }

  public onInitialize(): void {
    // 1. Register complete Encounter input mapping including D-Pad
    this.inputMapper.registerMap({
      name: INPUT_CONTEXT.Encounter,
      inputMap: {
        KeyPresses: new Set([Keys.W, Keys.S, Keys.A, Keys.D, Keys.E, Keys.F, Keys.Digit1, Keys.Digit2]),
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

    // 2. Unify event processing for Keyboard
    this.inputMapper.inputMapEmitter.on("keyPress", (data: any) => {
      if (data.ctx !== INPUT_CONTEXT.Encounter) return;
      this.processKeyboardInput(data.key);
    });

    // 3. Process Gamepad Button Input
    this.inputMapper.inputMapEmitter.on("gamepadButton", (data: any) => {
      if (data.ctx !== INPUT_CONTEXT.Encounter) return;
      this.processGamepadButton(data.button);
    });

    // 4. Process Gamepad Analog Stick Input
    this.inputMapper.inputMapEmitter.on("gamepadStick", (data: any) => {
      if (data.ctx !== INPUT_CONTEXT.Encounter) return;
      if (data.event === "leftStick") {
        this.processStickDirection(data.direction);
      }
    });
  }

  public onActivate(): void {
    this.inputMapper.switchContext(INPUT_CONTEXT.Encounter);

    const state = this.store.get();
    const encounter = state.game.encounter;

    if (!encounter) {
      console.warn("[EncounterScene] Activated without active encounter state!");
      return;
    }

    this.stateMachine = new CombatStateMachine(this.store, this.contentRegistry);
    this.queueManager = new ActionQueueManager(this.stateMachine, this);

    this.gridRenderer = new DungeonGridRenderer({
      store: this.store,
      tileSize: this.TILE_SIZE,
    });
    this.add(this.gridRenderer);

    this.setupCombatEntities(encounter);
  }

  // --- INPUT DISPATCH HELPERS ---

  private isPlayerTurnValid(): boolean {
    const encounter = this.store.get().game.encounter;
    if (!encounter || encounter.isResolved) return false;
    if (encounter.currentTurn !== "player") {
      console.warn(`[EncounterScene] Input ignored: waiting for turn '${encounter?.currentTurn}'`);
      return false;
    }
    return true;
  }

  private processKeyboardInput(key: Keys): void {
    if (!this.isPlayerTurnValid()) return;

    switch (key) {
      case Keys.W:
        this.attemptGridMove(0, -1);
        break;
      case Keys.S:
        this.attemptGridMove(0, 1);
        break;
      case Keys.A:
        this.attemptGridMove(-1, 0);
        break;
      case Keys.D:
        this.attemptGridMove(1, 0);
        break;
      case Keys.Digit1:
        this.triggerPrimaryAttack();
        break;
      case Keys.Digit2:
      case Keys.F:
        this.triggerFlee();
        break;
    }
  }

  private processGamepadButton(button: Buttons): void {
    if (!this.isPlayerTurnValid()) return;

    switch (button) {
      case Buttons.DpadUp:
        this.attemptGridMove(0, -1);
        break;
      case Buttons.DpadDown:
        this.attemptGridMove(0, 1);
        break;
      case Buttons.DpadLeft:
        this.attemptGridMove(-1, 0);
        break;
      case Buttons.DpadRight:
        this.attemptGridMove(1, 0);
        break;
      case Buttons.Face1: // A / Cross -> Primary Attack
        this.triggerPrimaryAttack();
        break;
      case Buttons.Face2: // B / Circle -> Flee
        this.triggerFlee();
        break;
    }
  }

  private processStickDirection(direction: string): void {
    if (!this.isPlayerTurnValid()) return;

    switch (direction) {
      case "up":
        this.attemptGridMove(0, -1);
        break;
      case "down":
        this.attemptGridMove(0, 1);
        break;
      case "left":
        this.attemptGridMove(-1, 0);
        break;
      case "right":
        this.attemptGridMove(1, 0);
        break;
    }
  }

  // --- GRID ACTIONS ---

  private attemptGridMove(deltaX: number, deltaY: number): void {
    const state = this.store.get();
    const encounter = state.game.encounter;
    if (!encounter) return;

    const playerPos = encounter.playerPosition ?? state.player?.position;
    if (!playerPos) return;

    const currentX = Math.floor(playerPos.x);
    const currentY = Math.floor(playerPos.y);
    const { minX, maxX, minY, maxY } = encounter.arenaBounds;

    const targetX = Math.max(minX, Math.min(maxX, currentX + deltaX));
    const targetY = Math.max(minY, Math.min(maxY, currentY + deltaY));

    if (targetX !== currentX || targetY !== currentY) {
      this.handlePlayerAction({
        type: "move" as any,
        targetTile: { x: targetX, y: targetY },
      });
    }
  }

  private triggerPrimaryAttack(): void {
    const state = this.store.get();
    const encounter = state.game.encounter;
    if (!encounter) return;

    const enemyIds = encounter.enemyInstanceIds ?? (encounter.activeEnemyInstanceId ? [encounter.activeEnemyInstanceId] : []);
    const targetId = encounter.activeEnemyInstanceId ?? enemyIds.find(id => state.dungeon?.enemies?.[id]?.alive);

    if (targetId) {
      this.handlePlayerAction({
        type: "attack",
        targetId: targetId,
      });
    }
  }

  private triggerFlee(): void {
    this.handlePlayerAction({
      type: "flee",
    });
  }

  public handlePlayerAction(action: CombatAction): void {
    const encounter = this.store.get().game.encounter;
    if (!encounter || encounter.isResolved) return;

    const targetId = action.targetId ?? encounter.activeEnemyInstanceId;
    console.log("[EncounterScene] Dispatching player action to queueManager:", action);
    this.queueManager.enqueuePlayerAction(action, targetId ?? "");
  }

  private setupCombatEntities(encounter: NonNullable<GameState["game"]["encounter"]>): void {
    this.enemyActors.clear();
    const state = this.store.get();
    const { minX, maxX, minY, maxY } = encounter.arenaBounds;

    const canvasWidth = 960;
    const canvasHeight = 540;
    const gridWidth = (maxX - minX + 1) * this.TILE_SIZE;
    const gridHeight = (maxY - minY + 1) * this.TILE_SIZE;
    const offsetX = (canvasWidth - gridWidth) / 2;
    const offsetY = (canvasHeight - gridHeight) / 2;

    const getTileCenter = (x: number, y: number) => {
      return vec(
        offsetX + (x - minX) * this.TILE_SIZE + this.TILE_SIZE / 2,
        offsetY + (y - minY) * this.TILE_SIZE + this.TILE_SIZE / 2,
      );
    };

    // 1. Spawn Player Token
    const playerPos = encounter.playerPosition ?? state.player?.position;
    if (playerPos) {
      const pTileX = Math.floor(playerPos.x);
      const pTileY = Math.floor(playerPos.y);

      this.playerActor = new Actor({
        pos: getTileCenter(pTileX, pTileY),
        radius: this.TILE_SIZE / 3,
        color: Color.fromHex("#3b82f6"),
      });

      this.add(this.playerActor);
    }

    // 2. Spawn Enemy Tokens
    const enemyIds = encounter.enemyInstanceIds ?? (encounter.activeEnemyInstanceId ? [encounter.activeEnemyInstanceId] : []);

    for (const enemyId of enemyIds) {
      const enemyState: EnemyState | undefined = state.dungeon?.enemies?.[enemyId];

      if (enemyState && enemyState.alive) {
        const ePos = encounter.enemyPositions?.[enemyId] ?? enemyState.position;
        const eTileX = Math.floor(ePos.x);
        const eTileY = Math.floor(ePos.y);

        const enemyActor = new Actor({
          pos: getTileCenter(eTileX, eTileY),
          radius: this.TILE_SIZE / 3,
          color: Color.fromHex("#ef4444"),
        });

        this.enemyActors.set(enemyId, enemyActor);
        this.add(enemyActor);
      }
    }
  }

  public updateActorPositions(): void {
    const state = this.store.get();
    const encounter = state.game.encounter;
    if (!encounter) return;

    const { minX, maxX, minY, maxY } = encounter.arenaBounds;
    const canvasWidth = 960;
    const canvasHeight = 540;
    const gridWidth = (maxX - minX + 1) * this.TILE_SIZE;
    const gridHeight = (maxY - minY + 1) * this.TILE_SIZE;
    const offsetX = (canvasWidth - gridWidth) / 2;
    const offsetY = (canvasHeight - gridHeight) / 2;

    const getTileCenter = (x: number, y: number) =>
      vec(offsetX + (x - minX) * this.TILE_SIZE + this.TILE_SIZE / 2, offsetY + (y - minY) * this.TILE_SIZE + this.TILE_SIZE / 2);

    // 1. Re-position Player
    const playerPos = encounter.playerPosition ?? state.player?.position;
    if (this.playerActor && playerPos) {
      this.playerActor.pos = getTileCenter(Math.floor(playerPos.x), Math.floor(playerPos.y));
    }

    // 2. Re-position & Clean up Enemies
    this.enemyActors.forEach((enemyActor, enemyId) => {
      const enemyState = state.dungeon?.enemies?.[enemyId];

      if (!enemyState || !enemyState.alive || enemyState.state === "dead") {
        enemyActor.kill();
        this.enemyActors.delete(enemyId);
        return;
      }

      const ePos = encounter.enemyPositions?.[enemyId] ?? enemyState.position;
      enemyActor.pos = getTileCenter(Math.floor(ePos.x), Math.floor(ePos.y));
    });
  }

  public onDeactivate(): void {
    this.clear();
  }
}
