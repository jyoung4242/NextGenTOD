// Scenes/EncounterScene.ts
import { Scene, Actor, vec, Axes, Buttons, Keys, Vector } from "excalibur";
import * as ex from "excalibur";
import { StateStore } from "../GameState";
import { GameState, CombatAction, EnemyState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";
import { DungeonGridRenderer } from "../UI/DungeonGridRenderer";
import { INPUT_CONTEXT } from "../main";
import { InputMapSystem } from "../Lib/Systems/InputMapper";
import { ActionQueueManager } from "../Lib/Managers/ActionQueueManager";
import { CombatStateMachine } from "../Lib/Systems/CombatStateMachine";
import { getLoadedTextures, Resources } from "../resources"; // Import texture loader

export class EncounterScene extends Scene {
  private playerActor?: Actor;
  private enemyActors: Map<string, Actor> = new Map();
  public gridRenderer?: DungeonGridRenderer;
  private readonly TILE_SIZE = 48;

  private currentZoom = 1.0;
  private readonly MIN_ZOOM = 0.5;
  private readonly MAX_ZOOM = 3.0;
  private readonly ZOOM_STEP = 0.15;

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
        KeyPresses: new Set([
          Keys.W,
          Keys.S,
          Keys.A,
          Keys.D,
          Keys.Digit1,
          Keys.Digit2,
          Keys.Digit3,
          Keys.Digit4,
          Keys.Digit5,
          Keys.Digit6,
          Keys.Space,
          Keys.E,
          Keys.F,
          Keys.I,
          Keys.R,
          Keys.T,
          Keys.Equal,
          Keys.Minus, // Plus/Equal (=) to zoom in, Minus (-) to zoom out
        ]),
        GamepadButtonsTriggers: new Set([
          Buttons.Face1,
          Buttons.Face2,
          Buttons.Face3,
          Buttons.Face4,
          Buttons.DpadUp,
          Buttons.DpadDown,
          Buttons.DpadLeft,
          Buttons.DpadRight,
          Buttons.LeftBumper,
          Buttons.RightBumper,
          Buttons.LeftTrigger,
          Buttons.RightTrigger,
          Buttons.RightStick, // Optional: Use right stick press for zoom in/out
          // Bind bumpers or other buttons for gamepad zoom if desired, e.g.:
          // Buttons.RightTrigger, Buttons.LeftTrigger (or use triggers below)
        ]),
        // GamepadAxesTriggers: new Set([
        //   Axes.LeftStickX,
        //   Axes.LeftStickY,
        //   Axes.RightStickY, // Can use right stick vertical for zoom!
        // ]),
      },
    });

    // 2. Unify event processing for Keyboard
    this.inputMapper.inputMapEmitter.on("keyPress", (data: any) => {
      if (this.inputMapper.getCurrentContext() !== INPUT_CONTEXT.Encounter) return;
      this.processKeyboardInput(data.key);
    });

    // 3. Process Gamepad Button Input
    this.inputMapper.inputMapEmitter.on("gamepadButton", (data: any) => {
      if (this.inputMapper.getCurrentContext() !== INPUT_CONTEXT.Encounter) return;
      this.processGamepadButton(data.button);
    });

    // 4. Process Gamepad Analog Stick Input
    this.inputMapper.inputMapEmitter.on("gamepadStick", (data: any) => {
      if (this.inputMapper.getCurrentContext() !== INPUT_CONTEXT.Encounter) return;
      if (data.event === "leftStick") {
        this.processStickDirection(data.direction);
      }
    });
  }

  // --- ZOOM CONTROL LOGIC ---

  private adjustZoom(delta: number): void {
    this.currentZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.currentZoom + delta));
    if (this.camera) {
      this.camera.zoom = this.currentZoom;
    }
    console.log(`[EncounterScene] Zoom adjusted to: ${this.currentZoom.toFixed(2)}`);
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

    // 1. Calculate arena offsets first
    const { minX, maxX, minY, maxY } = encounter.arenaBounds;
    const canvasWidth = 960;
    const canvasHeight = 540;
    const gridWidth = (maxX - minX + 1) * this.TILE_SIZE;
    const gridHeight = (maxY - minY + 1) * this.TILE_SIZE;
    const offsetX = (canvasWidth - gridWidth) / 2;
    const offsetY = (canvasHeight - gridHeight) / 2;

    // 2. Pass the offset position to the Grid Renderer Actor
    this.gridRenderer = new DungeonGridRenderer({
      store: this.store,
      contentRegistry: this.contentRegistry,
      tileSize: this.TILE_SIZE,
      position: Vector.Zero,
    });
    this.add(this.gridRenderer);
    console.log("[EncounterScene] Added DungeonGridRenderer at offset:", offsetX, offsetY);
    // 3. Setup combat entities using the same offsets
    this.setupCombatEntities(encounter);

    console.log("[EncounterScene]: ", this.gridRenderer);
    console.log("[EncounterScene]: ", this.playerActor);
    console.log("[EncounterScene]: ", this.enemyActors);
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
      case Keys.Equal:
      case Keys.NumAdd:
        this.adjustZoom(this.ZOOM_STEP);
        break;
      case Keys.Minus:
      case Keys.NumSubtract:
        this.adjustZoom(-this.ZOOM_STEP);
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
      case Buttons.Face1:
        this.triggerPrimaryAttack();
        break;
      case Buttons.Face2:
        this.triggerFlee();
        break;
      case Buttons.Face3:
        this.triggerRangedAttack();
        break;
      case Buttons.Face4:
        this.triggerThrowItem();
        break;
      case Buttons.LeftBumper:
        this.triggerUseItem();
        break;
      case Buttons.RightBumper:
        this.triggerCastSpell();
        break;
      case Buttons.RightStick:
        this.triggerDefend();
        break;
      case Buttons.LeftTrigger:
        this.adjustZoom(-this.ZOOM_STEP);
        break;
      case Buttons.RightTrigger:
        this.adjustZoom(this.ZOOM_STEP);
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

  // --- ACTION TRIGGERS ---

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
        type: "move",
        targetTile: { x: targetX, y: targetY },
      });
    }
  }

  private triggerPrimaryAttack(): void {
    const targetId = this.getActiveOrFirstEnemyId();
    if (targetId) {
      this.handlePlayerAction({ type: "attack", targetId });
    }
  }

  private triggerRangedAttack(): void {
    const targetId = this.getActiveOrFirstEnemyId();
    if (targetId) {
      this.handlePlayerAction({ type: "ranged", targetId });
    }
  }

  private triggerThrowItem(): void {
    const targetId = this.getActiveOrFirstEnemyId();
    this.handlePlayerAction({ type: "throw", targetId });
  }

  private triggerUseItem(): void {
    this.handlePlayerAction({ type: "item", itemId: "health_potion" });
  }

  private triggerCastSpell(): void {
    const targetId = this.getActiveOrFirstEnemyId();
    this.handlePlayerAction({ type: "spell", skillId: "fireball", targetId });
  }

  private triggerDefend(): void {
    this.handlePlayerAction({ type: "defend" });
  }

  private triggerFlee(): void {
    this.handlePlayerAction({ type: "flee" });
  }

  private getActiveOrFirstEnemyId(): string | undefined {
    const state = this.store.get();
    const encounter = state.game.encounter;
    if (!encounter) return undefined;

    const enemyIds = encounter.enemyInstanceIds ?? (encounter.activeEnemyInstanceId ? [encounter.activeEnemyInstanceId] : []);
    return encounter.activeEnemyInstanceId ?? enemyIds.find(id => state.dungeon?.enemies?.[id]?.alive);
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
    const tokenSize = this.TILE_SIZE * 0.75;
    const { minX, minY } = encounter.arenaBounds;

    // Pure local position relative to the grid actor's top-left (0,0)
    const getLocalTileCenter = (x: number, y: number) => {
      return vec((x - minX) * this.TILE_SIZE + this.TILE_SIZE / 2, (y - minY) * this.TILE_SIZE + this.TILE_SIZE / 2);
    };

    // 1. Spawn Player Token Sprite Actor

    const playerPos = encounter.playerPosition ?? state.player?.position;
    console.log("[EncounterScene] Player Position:", playerPos);
    if (playerPos) {
      const pTileX = Math.floor(playerPos.x);
      const pTileY = Math.floor(playerPos.y);

      this.playerActor = new Actor({
        pos: getLocalTileCenter(pTileX, pTileY),
        width: tokenSize,
        height: tokenSize,
      });
      this.camera.strategy.lockToActor(this.playerActor);
      this.camera.zoom = 1.0;

      const playerImg = Resources.playerToken.toSprite();
      if (playerImg) {
        this.playerActor.graphics.use(playerImg);
      }

      this.gridRenderer!.addChild(this.playerActor);
    }

    // 2. Spawn Enemy Token Sprite Actors
    const enemyIds = encounter.enemyInstanceIds ?? (encounter.activeEnemyInstanceId ? [encounter.activeEnemyInstanceId] : []);

    for (const enemyId of enemyIds) {
      const enemyState: EnemyState | undefined = state.dungeon?.enemies?.[enemyId];

      if (enemyState && enemyState.alive) {
        const ePos = encounter.enemyPositions?.[enemyId] ?? enemyState.position;
        const eTileX = Math.floor(ePos.x);
        const eTileY = Math.floor(ePos.y);

        const enemyDef = this.contentRegistry.getEnemy(enemyState.definitionId);
        const tokenKey = enemyDef?.tokenKey ?? "goblinToken";
        //@ts-ignore
        const enemyImg = Resources[tokenKey].toSprite();

        const enemyActor = new Actor({
          pos: getLocalTileCenter(eTileX, eTileY),
          width: tokenSize,
          height: tokenSize,
        });

        if (enemyImg) {
          enemyActor.graphics.use(enemyImg);
        }

        this.enemyActors.set(enemyId, enemyActor);
        this.gridRenderer!.addChild(enemyActor);
      }
    }
  }

  public updateActorPositions(): void {
    const state = this.store.get();
    const encounter = state.game.encounter;
    if (!encounter) return;

    const { minX, minY } = encounter.arenaBounds;

    const getLocalTileCenter = (x: number, y: number) =>
      vec((x - minX) * this.TILE_SIZE + this.TILE_SIZE / 2, (y - minY) * this.TILE_SIZE + this.TILE_SIZE / 2);

    // 1. Re-position Player
    const playerPos = encounter.playerPosition ?? state.player?.position;
    if (this.playerActor && playerPos) {
      this.playerActor.pos = getLocalTileCenter(Math.floor(playerPos.x), Math.floor(playerPos.y));
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
      enemyActor.pos = getLocalTileCenter(Math.floor(ePos.x), Math.floor(ePos.y));
    });
  }

  // public updateActorPositions(): void {
  //   const state = this.store.get();
  //   const encounter = state.game.encounter;
  //   if (!encounter) return;

  //   const { minX, minY } = encounter.arenaBounds;

  //   const getLocalTileCenter = (x: number, y: number) =>
  //     vec((x - minX) * this.TILE_SIZE + this.TILE_SIZE / 2, (y - minY) * this.TILE_SIZE + this.TILE_SIZE / 2);

  //   // 1. Re-position Player
  //   const playerPos = encounter.playerPosition ?? state.player?.position;
  //   if (this.playerActor && playerPos) {
  //     this.playerActor.pos = getLocalTileCenter(Math.floor(playerPos.x), Math.floor(playerPos.y));
  //   }

  //   // 2. Re-position & Clean up Enemies
  //   this.enemyActors.forEach((enemyActor, enemyId) => {
  //     const enemyState = state.dungeon?.enemies?.[enemyId];

  //     if (!enemyState || !enemyState.alive || enemyState.state === "dead") {
  //       enemyActor.kill();
  //       this.enemyActors.delete(enemyId);
  //       return;
  //     }

  //     const ePos = encounter.enemyPositions?.[enemyId] ?? enemyState.position;
  //     enemyActor.pos = getLocalTileCenter(Math.floor(ePos.x), Math.floor(ePos.y));
  //   });
  // }

  public onDeactivate(): void {
    this.clear();
  }
}
