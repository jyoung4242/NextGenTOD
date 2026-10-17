// Scenes/EncounterScene.ts
import { Scene, Actor, vec, Axes, Buttons, Keys, Vector } from "excalibur";
import { StateStore } from "../GameState";
import { GameState, CombatAction, EnemyState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";
import { DungeonGridRenderer } from "../UI/DungeonGridRenderer";
import { ActionCarouselUI, ActionCardData } from "../UI/UICarousel";
import { INPUT_CONTEXT } from "../main";
import { InputMapSystem } from "../Lib/Systems/InputMapper";
import { ActionQueueManager } from "../Lib/Managers/ActionQueueManager";
import { CombatStateMachine } from "../Lib/Systems/CombatStateMachine";
import { attackSprite, defendSprite, fleeSprite, itemSprite, magicSprite, Resources, throwSprite } from "../resources";
import { TargetingSystem } from "../Lib/Systems/TargetingSystem";
import { TargetReticle } from "../Actors/TargetReticle";

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

  // Carousel UI & State
  private carouselUI?: ActionCarouselUI;
  private isCarouselOpen: boolean = false;

  // Add to your EncounterScene class properties
  private targetReticle?: TargetReticle; // Make sure to import TargetReticle from your Systems folder

  constructor(
    private readonly store: StateStore<GameState>,
    private readonly contentRegistry: ContentRegistry,
    private readonly inputMapper: InputMapSystem,
  ) {
    super();
  }

  public onInitialize(): void {
    // 1. Register Default Encounter Context Input Map
    this.inputMapper.registerMap({
      name: INPUT_CONTEXT.Encounter,
      inputMap: {
        KeyPresses: new Set([
          Keys.W,
          Keys.S,
          Keys.A,
          Keys.D,
          Keys.Space,
          Keys.E, // 👈 Used to trigger/execute the selected carousel action
          Keys.Equal,
          Keys.Minus,
        ]),
        GamepadButtonsTriggers: new Set([
          Buttons.Face1, // 👈 Used to trigger/execute the selected carousel action
          Buttons.Face3, // Used to toggle Carousel open/close
          Buttons.DpadUp,
          Buttons.DpadDown,
          Buttons.DpadLeft,
          Buttons.DpadRight,
          Buttons.LeftBumper,
          Buttons.RightBumper,
          Buttons.LeftTrigger,
          Buttons.RightTrigger,
        ]),
      },
    });

    // 2. Register Dedicated Carousel Context Input Map (Rotation & Confirmation)
    this.inputMapper.registerMap({
      name: INPUT_CONTEXT.Carousel,
      inputMap: {
        KeyPresses: new Set([Keys.A, Keys.D, Keys.ArrowLeft, Keys.ArrowRight, Keys.Enter, Keys.Space, Keys.Escape, Keys.Q]),
        GamepadButtonsTriggers: new Set([
          Buttons.DpadLeft,
          Buttons.DpadRight,
          Buttons.Face1, // Confirm selection
          Buttons.Face2, // Cancel / Hide carousel
        ]),
        GamepadAxesTriggers: new Set([Axes.LeftStickX]),
      },
    });

    // 3. Process Keyboard Input across active contexts
    this.inputMapper.inputMapEmitter.on("keyPress", (data: any) => {
      const activeContext = this.inputMapper.getCurrentContext();
      if (activeContext === INPUT_CONTEXT.Encounter) {
        this.processKeyboardInput(data.key);
      } else if (activeContext === INPUT_CONTEXT.Carousel) {
        this.processCarouselKeyboardInput(data.key);
      }
    });

    // 4. Process Gamepad Button Input across active contexts
    this.inputMapper.inputMapEmitter.on("gamepadButton", (data: any) => {
      const activeContext = this.inputMapper.getCurrentContext();
      if (activeContext === INPUT_CONTEXT.Encounter) {
        this.processGamepadButton(data.button);
      } else if (activeContext === INPUT_CONTEXT.Carousel) {
        this.processCarouselGamepadButton(data.button);
      }
    });

    // 5. Process Gamepad Stick Input across active contexts
    this.inputMapper.inputMapEmitter.on("gamepadStick", (data: any) => {
      const activeContext = this.inputMapper.getCurrentContext();
      if (activeContext === INPUT_CONTEXT.Encounter && data.event === "leftStick") {
        this.processStickDirection(data.direction);
      } else if (activeContext === INPUT_CONTEXT.Carousel && data.event === "leftStick") {
        if (data.direction === "left") this.carouselUI?.rotate(-1);
        if (data.direction === "right") this.carouselUI?.rotate(1);
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

    // Arena offsets setup
    const { minX, maxX, minY, maxY } = encounter.arenaBounds;
    const canvasWidth = 960;
    const canvasHeight = 540;
    const gridWidth = (maxX - minX + 1) * this.TILE_SIZE;
    const gridHeight = (maxY - minY + 1) * this.TILE_SIZE;
    const offsetX = (canvasWidth - gridWidth) / 2;
    const offsetY = (canvasHeight - gridHeight) / 2;

    this.gridRenderer = new DungeonGridRenderer({
      store: this.store,
      contentRegistry: this.contentRegistry,
      tileSize: this.TILE_SIZE,
      position: Vector.Zero,
    });
    this.add(this.gridRenderer);

    this.setupCombatEntities(encounter);

    // 🎯 Instantiate and add the Target Reticle overlay
    this.targetReticle = new TargetReticle({ tileSize: this.TILE_SIZE });
    this.gridRenderer!.addChild(this.targetReticle);

    // Initial call to position and display it on the active/default target
    this.updateTargetReticle();

    // Instantiate and add Action Carousel UI (Hidden by default)
    const actionList: ActionCardData[] = [
      { id: "attack", label: "Attack", sprite: attackSprite },
      { id: "magic", label: "Magic", sprite: magicSprite },
      { id: "item", label: "Item", sprite: itemSprite },
      { id: "defend", label: "Defend", sprite: defendSprite },
      { id: "throw", label: "Throw", sprite: throwSprite },
      { id: "flee", label: "Flee", sprite: fleeSprite },
    ];

    this.carouselUI = new ActionCarouselUI({
      gameActions: actionList,
      onActionSelected: selected => this.executeCarouselAction(selected),
    });

    this.carouselUI.pos = vec(80, 260); // Centered bottom overlay
    this.carouselUI.graphics.isVisible = false;
    this.add(this.carouselUI);
  }

  public updateTargetReticle(): void {
    const state = this.store.get();
    const encounter = state.game.encounter;
    if (!encounter || !this.targetReticle) return;

    // Resolve target using priority: currentTargetId -> activeEnemyInstanceId -> first living enemy
    const enemyIds = encounter.enemyInstanceIds ?? [];
    const targetId =
      encounter.currentTargetId ?? encounter.activeEnemyInstanceId ?? enemyIds.find(id => state.dungeon?.enemies?.[id]?.alive);

    const enemyPos = targetId ? encounter.enemyPositions?.[targetId] : undefined;
    const enemyState = targetId ? state.dungeon?.enemies?.[targetId] : undefined;

    if (enemyPos && enemyState && enemyState.alive) {
      const { minX, minY } = encounter.arenaBounds;
      const localX = (Math.floor(enemyPos.x) - minX) * this.TILE_SIZE + this.TILE_SIZE / 2;
      const localY = (Math.floor(enemyPos.y) - minY) * this.TILE_SIZE + this.TILE_SIZE / 2;

      this.targetReticle.pos = vec(localX, localY);
      this.targetReticle.graphics.isVisible = true;
    } else {
      this.targetReticle.graphics.isVisible = false;
    }
  }

  // --- CAROUSEL TOGGLE & EXECUTION ---

  private toggleCarousel(): void {
    if (!this.isPlayerTurnValid()) return;

    this.isCarouselOpen = !this.isCarouselOpen;

    if (this.isCarouselOpen) {
      this.inputMapper.switchContext(INPUT_CONTEXT.Carousel);
      if (this.carouselUI) this.carouselUI.graphics.isVisible = true;
      // console.log("[EncounterScene] Opened Carousel -> Context switched to Carousel");
    } else {
      this.closeCarousel();
    }
  }

  private closeCarousel(): void {
    this.isCarouselOpen = false;
    if (this.carouselUI) this.carouselUI.graphics.isVisible = false;
    this.inputMapper.switchContext(INPUT_CONTEXT.Encounter);
    // console.log("[EncounterScene] Closed Carousel -> Context switched to Encounter");
  }

  /**
   * Triggers the selected action directly from the carousel UI via getSelectedAction().
   * Simplified replacement for multiple distinct action buttons.
   */
  private triggerSelectedCarouselAction(): void {
    if (!this.isPlayerTurnValid() || !this.carouselUI) return;

    const selectedAction = this.carouselUI.getSelectedAction();
    console.log(`[EncounterScene] Executing selected carousel action: ${selectedAction.label} (${selectedAction.id})`);

    this.executeCarouselAction(selectedAction);
  }

  private executeCarouselAction(action: ActionCardData): void {
    if (this.isCarouselOpen) {
      this.closeCarousel();
    }

    const targetId = this.getActiveOrFirstEnemyId();

    switch (action.id) {
      case "attack":
        if (targetId) this.handlePlayerAction({ type: "attack", targetId });
        break;
      case "magic":
        if (targetId) this.handlePlayerAction({ type: "spell", skillId: "fireball", targetId });
        break;
      case "item":
        this.handlePlayerAction({ type: "item", itemId: "health_potion" });
        break;
      case "defend":
        this.handlePlayerAction({ type: "defend" });
        break;
      case "throw":
        if (targetId) this.handlePlayerAction({ type: "throw", targetId });
        break;
      case "flee":
        this.handlePlayerAction({ type: "flee" });
        break;
      default:
        console.warn(`[EncounterScene] Unhandled action id: ${action.id}`);
        break;
    }
  }

  // --- INPUT DISPATCHERS: CAROUSEL CONTEXT ---

  private processCarouselKeyboardInput(key: Keys): void {
    switch (key) {
      case Keys.A:
      case Keys.ArrowLeft:
        this.carouselUI?.rotate(-1);
        break;
      case Keys.D:
      case Keys.ArrowRight:
        this.carouselUI?.rotate(1);
        break;
      case Keys.Space:
      case Keys.Enter:
        this.carouselUI?.confirmSelection();
        break;
      case Keys.Escape:
      case Keys.Q:
        this.closeCarousel();
        break;
    }
  }

  private processCarouselGamepadButton(button: Buttons): void {
    switch (button) {
      case Buttons.DpadLeft:
        this.carouselUI?.rotate(-1);
        break;
      case Buttons.DpadRight:
        this.carouselUI?.rotate(1);
        break;
      case Buttons.Face1: // Confirm selection
        this.carouselUI?.confirmSelection();
        break;
      case Buttons.Face2: // Cancel / Close
        this.closeCarousel();
        break;
    }
  }

  // --- ZOOM CONTROL LOGIC ---

  private adjustZoom(delta: number): void {
    this.currentZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.currentZoom + delta));
    if (this.camera) {
      this.camera.zoom = this.currentZoom;
    }
    console.log(`[EncounterScene] Zoom adjusted to: ${this.currentZoom.toFixed(2)}`);
  }

  // --- INPUT DISPATCHERS: DEFAULT ENCOUNTER CONTEXT ---

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
      case Keys.E:
        // 🚀 Replaced individual keys: E triggers the currently selected carousel action
        this.triggerSelectedCarouselAction();
        break;
      case Keys.Space:
        // Space toggles the carousel open/close view
        this.toggleCarousel();
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

    const state = this.store.get();
    const encounter = state.game.encounter;

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
        // 🚀 Replaced individual triggers: Face1 executes the currently selected carousel action
        this.triggerSelectedCarouselAction();
        break;
      case Buttons.Face3: // Open/Close Action Carousel overlay view
        this.toggleCarousel();
        break;
      case Buttons.LeftBumper: {
        if (encounter) {
          const prevTargetId = TargetingSystem.cycleTarget(state, -1);
          if (prevTargetId) {
            this.store.batch(ctx => {
              ctx.set("game.encounter", {
                ...encounter,
                currentTargetId: prevTargetId,
              });
            });
            this.updateTargetReticle(); // 👈 Refresh reticle position
          }
        }
        break;
      }
      case Buttons.RightBumper: {
        if (encounter) {
          const nextId = TargetingSystem.cycleTarget(state, 1);
          if (nextId) {
            this.store.batch(ctx => {
              ctx.set("game.encounter", {
                ...encounter,
                currentTargetId: nextId,
              });
            });
            this.updateTargetReticle(); // 👈 Refresh reticle position
          }
        }
        break;
      }
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

  private getActiveOrFirstEnemyId(): string | undefined {
    const state = this.store.get();
    const encounter = state.game.encounter;
    if (!encounter) return undefined;

    const enemyIds = encounter.enemyInstanceIds ?? [];

    // 🎯 Priority: Current cycled target -> Active instance -> First living enemy
    return encounter.currentTargetId ?? encounter.activeEnemyInstanceId ?? enemyIds.find(id => state.dungeon?.enemies?.[id]?.alive);
  }

  public handlePlayerAction(action: CombatAction): void {
    const encounter = this.store.get().game.encounter;
    if (!encounter || encounter.isResolved) return;

    const targetId = action.targetId ?? encounter.activeEnemyInstanceId;
    // console.log("[EncounterScene] Dispatching player action to queueManager:", action);
    this.queueManager.enqueuePlayerAction(action, targetId ?? "");
  }

  private setupCombatEntities(encounter: NonNullable<GameState["game"]["encounter"]>): void {
    this.enemyActors.clear();
    const state = this.store.get();
    const tokenSize = this.TILE_SIZE * 0.75;
    const { minX, minY } = encounter.arenaBounds;

    const getLocalTileCenter = (x: number, y: number) => {
      return vec((x - minX) * this.TILE_SIZE + this.TILE_SIZE / 2, (y - minY) * this.TILE_SIZE + this.TILE_SIZE / 2);
    };

    // 1. Spawn Player Token
    const playerPos = encounter.playerPosition ?? state.player?.position;
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

    // 2. Spawn Enemy Tokens
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

    const playerPos = encounter.playerPosition ?? state.player?.position;
    if (this.playerActor && playerPos) {
      this.playerActor.pos = getLocalTileCenter(Math.floor(playerPos.x), Math.floor(playerPos.y));
    }

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

    this.updateTargetReticle();
  }

  public onDeactivate(): void {
    this.clear();
  }
}
