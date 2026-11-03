// Scenes/EncounterScene.ts
import { Scene, Actor, vec, Axes, Buttons, Keys, Vector, Color } from "excalibur";
import { StateStore } from "../GameState";
import { GameState, CombatAction, EnemyState, DungeonState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";
import { DungeonGridRenderer } from "../UI/DungeonGridRenderer";
import { ActionCarouselUI, ActionCardData } from "../UI/UICarousel";
import { INPUT_CONTEXT } from "../main";
import { InputMapSystem } from "../Lib/Systems/InputMapper";
import { ActionQueueManager } from "../Lib/Managers/ActionQueueManager";
import { CombatStateMachine } from "../Lib/Systems/CombatStateMachine";
import {
  attackSprite,
  defendSprite,
  fleeSprite,
  itemSprite,
  magicSprite,
  Resources,
  throwSprite,
  getLoadedTextures,
} from "../resources";
import { TargetingSystem } from "../Lib/Systems/TargetingSystem";
import { TargetReticle } from "../Actors/TargetReticle";
import { CharacterStatusGraphic, CharacterStatusHUD } from "../UI/CharacterStatusHUD";
import { FloatingText } from "../Actors/FloatingText";
import { CutSceneSystem } from "../Lib/Managers/CutScenes";
import { QuestManager } from "../Lib/Managers/QuestManager";
import { EncounterTriggerSystem } from "../Lib/Systems/EncounterTrigger";
import { DialogUI } from "../UI/DialogUI";
import { ToastManager } from "../UI/ToastManager";

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

  private targetReticle?: TargetReticle;

  private statusHud?: CharacterStatusHUD;

  // Cutscene & Dialogue Support
  public dialogUI: DialogUI | null = null;
  private cutSceneSystem!: CutSceneSystem;
  private questManager!: QuestManager;

  // 🚀 Persistent ToastManager instance stored directly on the scene
  private toastManager!: ToastManager;

  private unubscribeStore?: () => void;

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
          Keys.E, // Used to execute selected carousel action
          Keys.Equal,
          Keys.Minus,
        ]),
        GamepadButtonsTriggers: new Set([
          Buttons.Face1, // Execute carousel action
          Buttons.Face3, // Toggle Carousel
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

    this.dialogUI = new DialogUI(this.inputMapper);
    this.questManager = new QuestManager(this.store);
    // 🚀 Initialize ToastManager once on setup
    this.toastManager = new ToastManager(() => this.store, false);
    this.add(this.toastManager.getHUD());
    for (const [id, questDef] of this.contentRegistry.quests.entries()) {
      this.questManager.registerQuestData(questDef);
    }

    this.cutSceneSystem = new CutSceneSystem(this.world, () => this.store, this.questManager);
    this.world.add(this.cutSceneSystem);
    this.cutSceneSystem.setDialogUI(this.dialogUI);

    // Register all cutscenes dynamically from ContentRegistry
    for (const [id, manifest] of this.contentRegistry.cutscenes.entries()) {
      this.cutSceneSystem.registerCutScene(id, manifest);
    }

    // Register End-of-Encounter Victory/Summary Cutscene Manifest
    this.cutSceneSystem.registerCutScene("encounter-summary", {
      id: "encounter-summary",
      commands: [
        {
          type: "encounter_summary",
          args: {},
        },
      ],
    });

    // Register Flee Cutscene Manifest
    this.cutSceneSystem.registerCutScene("encounter-flee", {
      id: "encounter-flee",
      commands: [
        {
          type: "encounter_flee",
          args: {},
        },
      ],
    });

    // Register Defeat Cutscene Manifest
    this.cutSceneSystem.registerCutScene("encounter-defeat", {
      id: "encounter-defeat",
      commands: [
        {
          type: "encounter_defeat",
          args: {},
        },
      ],
    });

    // Pass the CutSceneSystem into the CombatStateMachine
    this.stateMachine = new CombatStateMachine(this.store, this.contentRegistry, this.cutSceneSystem, this.toastManager);
  }

  public onActivate(): void {
    this.inputMapper.switchContext(INPUT_CONTEXT.Encounter);

    const state = this.store.get();
    const encounter = state.game.encounter;

    if (!encounter) {
      console.warn("[EncounterScene] Activated without active encounter state!");
      return;
    }

    this.stateMachine = new CombatStateMachine(this.store, this.contentRegistry, this.cutSceneSystem, this.toastManager);
    this.queueManager = new ActionQueueManager(this.stateMachine);

    this.gridRenderer = new DungeonGridRenderer({
      store: this.store,
      contentRegistry: this.contentRegistry,
      tileSize: this.TILE_SIZE,
      position: Vector.Zero,
    });
    this.add(this.gridRenderer);

    this.statusHud = new CharacterStatusHUD(this.store);
    this.add(this.statusHud);

    this.setupCombatEntities(encounter);

    // Listen for changes to encounter state
    this.unubscribeStore = this.store.subscribe("game.encounter", payload => {
      this.updateActorPositions();

      if (this.gridRenderer && (this.gridRenderer as any).gridGraphic) {
        (this.gridRenderer as any).gridGraphic.flagDirty();
      }
      if (this.statusHud) {
        if (this.statusHud.graphics.current && this.statusHud.graphics.current instanceof CharacterStatusGraphic)
          this.statusHud.graphics.current!.flagDirty();
      }

      const prevLog = payload.previousValue?.combatLog ?? [];
      const currentLog = payload.value?.combatLog ?? [];

      if (currentLog.length > prevLog.length) {
        for (let i = prevLog.length; i < currentLog.length; i++) {
          const logMessage = currentLog[i];
          this.handleCombatLogFCT(logMessage);
        }
      }
    });

    // Instantiate and add Target Reticle overlay
    this.targetReticle = new TargetReticle({ tileSize: this.TILE_SIZE });
    this.gridRenderer.addChild(this.targetReticle);

    // Initial positioning of target reticle
    this.updateTargetReticle();

    // Main game action list
    const actionList: ActionCardData[] = [
      { id: "attack", label: "Attack", sprite: attackSprite },
      { id: "magic", label: "Magic", sprite: magicSprite },
      { id: "item", label: "Item", sprite: itemSprite },
      { id: "defend", label: "Defend", sprite: defendSprite },
      { id: "throw", label: "Throw", sprite: throwSprite },
      { id: "flee", label: "Flee", sprite: fleeSprite },
    ];

    // Instantiate and add Action Carousel UI with Spell Selection support
    this.carouselUI = new ActionCarouselUI({
      gameActions: actionList,
      textureMap: getLoadedTextures(),

      // Fetches player's known spells dynamically from store & registry
      getKnownSpells: () => {
        const knownSpellIds = this.store.get().player.spellBook?.spells || [];

        return knownSpellIds.map(spellId => {
          const spellDef = this.contentRegistry.getSpell(spellId);
          return {
            id: spellId,
            label: spellDef?.name || spellId,
            textureKey: spellDef?.textureKey,
          };
        });
      },

      onActionSelected: action => {
        console.log(`[EncounterScene] Action selected: ${action.label}`);
        this.executeCarouselAction(action);
      },

      // Executes spell action directly when confirmed in carousel
      onSpellSelected: spellId => {
        console.log(`[EncounterScene] Spell selected to cast: ${spellId}`);
        this.store.set("player.spellBook.activeSpellId", spellId);

        if (this.isCarouselOpen) {
          this.closeCarousel();
        }

        const targetId = this.getActiveOrFirstEnemyId();
        if (targetId) {
          this.handlePlayerAction({ type: "spell", skillId: spellId, targetId });
        }
      },
    });

    this.carouselUI.pos = vec(80, 260);
    this.carouselUI.graphics.isVisible = false;
    this.add(this.carouselUI);
    this.cutSceneSystem.init();
  }

  public spawnFloatingText(text: string, gridX: number, gridY: number, color?: Color): void {
    const encounter = this.store.get().game.encounter;
    if (!encounter) return;

    const { minX, minY } = encounter.arenaBounds;
    const localX = (gridX - minX) * this.TILE_SIZE + this.TILE_SIZE / 2;
    const localY = (gridY - minY) * this.TILE_SIZE + this.TILE_SIZE / 2;

    const fct = new FloatingText({
      text,
      pos: vec(localX, localY - 12),
      color: color ?? Color.Red,
    });

    this.gridRenderer?.addChild(fct);
  }

  public updateTargetReticle(): void {
    const state = this.store.get();
    const encounter = state.game.encounter;
    if (!encounter || !this.targetReticle) return;

    const activeDungeonId = state.dungeon.current;
    const activeDungeon = state.dungeon.registry?.[activeDungeonId] as DungeonState;
    const dungeonEnemies = activeDungeon.enemies;

    const enemyIds = encounter.enemyInstanceIds ?? [];
    const targetId = encounter.currentTargetId ?? encounter.activeEnemyInstanceId ?? enemyIds.find(id => dungeonEnemies?.[id]?.alive);

    const enemyPos = targetId ? encounter.enemyPositions?.[targetId] : undefined;
    const enemyState = targetId ? dungeonEnemies?.[targetId] : undefined;

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
    } else {
      this.closeCarousel();
    }
  }

  private closeCarousel(): void {
    this.isCarouselOpen = false;
    if (this.carouselUI) this.carouselUI.graphics.isVisible = false;
    this.inputMapper.switchContext(INPUT_CONTEXT.Encounter);
  }

  private triggerSelectedCarouselAction(): void {
    if (!this.isPlayerTurnValid() || !this.carouselUI) return;

    // Delegates confirmation to the carousel UI (handles drill-down spell submenu & main action dispatching)
    this.carouselUI.confirmSelection();
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
        // Magic selection is handled by the carousel's internal spell submenu
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
      case Buttons.Face1:
        this.carouselUI?.confirmSelection();
        break;
      case Buttons.Face2:
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
        this.triggerSelectedCarouselAction();
        break;
      case Keys.Space:
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
        this.triggerSelectedCarouselAction();
        break;
      case Buttons.Face3:
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
            this.updateTargetReticle();
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
            this.updateTargetReticle();
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

    const activeDungeonId = state.dungeon.current;
    const activeDungeon = state.dungeon.registry?.[activeDungeonId] as DungeonState;
    const dungeonEnemies = activeDungeon.enemies;

    const enemyIds = encounter.enemyInstanceIds ?? [];

    return encounter.currentTargetId ?? encounter.activeEnemyInstanceId ?? enemyIds.find(id => dungeonEnemies?.[id]?.alive);
  }

  public handlePlayerAction(action: CombatAction): void {
    const encounter = this.store.get().game.encounter;
    if (!encounter || encounter.isResolved) return;

    const targetId = action.targetId ?? encounter.activeEnemyInstanceId;
    this.queueManager.enqueuePlayerAction(action, targetId ?? "");
  }

  private setupCombatEntities(encounter: NonNullable<GameState["game"]["encounter"]>): void {
    this.enemyActors.clear();
    const state = this.store.get();
    const activeDungeonId = state.dungeon.current;
    const activeDungeonState = state.dungeon.registry?.[activeDungeonId] as DungeonState;
    const dungeonEnemies = activeDungeonState?.enemies ?? (state.dungeon as any).enemies ?? {};

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
      const enemyState: EnemyState | undefined = dungeonEnemies?.[enemyId];

      if (enemyState && enemyState.alive) {
        const ePos = encounter.enemyPositions?.[enemyId] ?? enemyState.position;
        const eTileX = Math.floor(ePos.x);
        const eTileY = Math.floor(ePos.y);

        const enemyDef = this.contentRegistry.getEnemy(enemyState.definitionId);
        const tokenKey = enemyDef?.tokenKey ?? "goblinToken";

        const resourceRecord = Resources as Record<string, any>;
        const enemyImg = resourceRecord[tokenKey]?.toSprite();

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

    const activeDungeonId = state.dungeon.current;
    const activeDungeon = state.dungeon.registry?.[activeDungeonId] as DungeonState;
    const dungeonEnemies = activeDungeon.enemies;

    const { minX, minY } = encounter.arenaBounds;

    const getLocalTileCenter = (x: number, y: number) =>
      vec((x - minX) * this.TILE_SIZE + this.TILE_SIZE / 2, (y - minY) * this.TILE_SIZE + this.TILE_SIZE / 2);

    const playerPos = encounter.playerPosition ?? state.player?.position;
    if (this.playerActor && playerPos) {
      this.playerActor.pos = getLocalTileCenter(Math.floor(playerPos.x), Math.floor(playerPos.y));
    }

    this.enemyActors.forEach((enemyActor, enemyId) => {
      const enemyState = dungeonEnemies?.[enemyId];

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
    if (this.unubscribeStore) {
      this.unubscribeStore();
    }
    this.clear(false);
  }

  private handleCombatLogFCT(logEntry: string | any): void {
    const state = this.store.get();
    const encounter = state.game.encounter;
    if (!encounter) return;

    const playerPos = encounter.playerPosition ?? state.player?.position;

    if (typeof logEntry === "object" && logEntry !== null) {
      if (Array.isArray(logEntry.affectedTargets) && logEntry.affectedTargets.length > 0) {
        for (const targetHit of logEntry.affectedTargets) {
          const targetPos = encounter.enemyPositions?.[targetHit.targetId];
          if (targetPos && targetHit.damage > 0) {
            this.spawnFloatingText(`-${targetHit.damage}`, targetPos.x, targetPos.y, Color.Red);
          }
        }
        return;
      } else if (!logEntry.isHit && logEntry.damage == 0) {
        const targetPos = logEntry.log?.structuredResult?.targetPos;
        if (targetPos) {
          this.spawnFloatingText(`Missed!`, targetPos.x, targetPos.y, Color.White);
        }
      }

      if (logEntry.structuredResult) {
        const { damage, isHit } = logEntry.structuredResult;
        const targetId = encounter.currentTargetId ?? encounter.activeEnemyInstanceId;
        const targetPos = targetId ? encounter.enemyPositions?.[targetId] : undefined;

        if (targetPos && isHit && damage > 0) {
          this.spawnFloatingText(`-${damage}`, targetPos.x, targetPos.y, Color.Red);
          return;
        } else if (targetPos && !isHit) {
          this.spawnFloatingText(`Missed!`, targetPos.x, targetPos.y, Color.White);
        }
      }
    }

    const message = typeof logEntry === "string" ? logEntry : (logEntry?.log?.logmessage ?? "");
    if (!message) return;

    const targetId = encounter.currentTargetId ?? encounter.activeEnemyInstanceId;
    const targetPos = targetId ? encounter.enemyPositions?.[targetId] : undefined;

    const damageMatch = message.match(/for\s+(\d+)\s+damage/i);
    if (damageMatch && targetPos) {
      const damageVal = damageMatch[1];
      this.spawnFloatingText(`-${damageVal}`, targetPos.x, targetPos.y, Color.Red);
      return;
    }

    const healMatch = message.match(/restored\s+(\d+)\s+HP/i);
    if (healMatch && playerPos) {
      const healVal = healMatch[1];
      this.spawnFloatingText(`+${healVal}`, playerPos.x, playerPos.y, Color.Green);
      return;
    }

    const playerDamageMatch = message.match(/strikes for\s+(\d+)\s+damage/i) || message.match(/counter-attacks for\s+(\d+)\s+damage/i);
    if (playerDamageMatch && playerPos) {
      const damageVal = playerDamageMatch[1];
      this.spawnFloatingText(`-${damageVal}`, playerPos.x, playerPos.y, Color.fromRGB(255, 100, 100));
      return;
    }
  }
}
