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
  private enemyActors: Map<string, Actor> = new Map(); // ✅ Track enemy actors by ID
  public gridRenderer?: DungeonGridRenderer;
  private readonly TILE_SIZE = 48;

  // Re-instantiated on every activation
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
    // 1. Register input context map once
    this.inputMapper.registerMap({
      name: INPUT_CONTEXT.Encounter,
      inputMap: {
        KeyPresses: new Set([Keys.W, Keys.S, Keys.A, Keys.D, Keys.E, Keys.F, Keys.Key1, Keys.Key2]),
        GamepadButtonsTriggers: new Set([Buttons.Face1, Buttons.Face2]),
        GamepadAxesTriggers: new Set([Axes.LeftStickX, Axes.LeftStickY]),
      },
    });

    // 2. Process input events routed from InputMapSystem
    this.inputMapper.inputMapEmitter.on("keyPress", (data: any) => {
      const keyName = typeof data === "object" && data?.key ? data.key : data;
      console.log("keypress", keyName);

      const state = this.store.get();
      const encounter = state.game.encounter;

      // Guard checks: ensure encounter is active and it's the player's turn
      if (!encounter || encounter.isResolved) return;
      if (encounter.currentTurn !== "player") {
        console.warn(`[EncounterScene] Input ignored: waiting for turn '${encounter.currentTurn}'`);
        return;
      }

      // Resolve target enemy (active target or first living enemy)
      const enemyIds = encounter.enemyInstanceIds ?? (encounter.activeEnemyInstanceId ? [encounter.activeEnemyInstanceId] : []);
      const targetId = encounter.activeEnemyInstanceId ?? enemyIds.find(id => state.dungeon?.enemies?.[id]?.alive);

      // Read tactical player position (fallback to dungeon position)
      const playerPos = encounter.playerPosition ?? state.player?.position;
      if (!playerPos) return;
      const currentX = Math.floor(playerPos.x);
      const currentY = Math.floor(playerPos.y);
      const { minX, maxX, minY, maxY } = encounter.arenaBounds;

      let targetX = currentX;
      let targetY = currentY;

      switch (keyName) {
        // --- MOVEMENT ACTIONS ---
        case Keys.W:
        case "KeyW":
          targetY = Math.max(minY, currentY - 1);
          break;

        case Keys.S:
        case "KeyS":
          targetY = Math.min(maxY, currentY + 1);
          break;

        case Keys.A:
        case "KeyA":
          targetX = Math.max(minX, currentX - 1);
          break;

        case Keys.D:
        case "KeyD":
          targetX = Math.min(maxX, currentX + 1);
          break;

        // --- COMBAT ACTIONS ---
        case Keys.Key1:
          console.log("[EncounterScene] Player chose to attack target:", targetId);
          if (targetId) {
            this.handlePlayerAction({
              type: "attack",
              targetId: targetId,
            });
          }
          return;

        case Keys.Key2:
        case Keys.F:
          console.log("[EncounterScene] Player chose to flee");
          this.handlePlayerAction({
            type: "flee",
          });
          return;
      }

      // --- DISPATCH MOVE IF POSITION CHANGED ---
      if (targetX !== currentX || targetY !== currentY) {
        this.handlePlayerAction({
          type: "move" as any,
          targetTile: { x: targetX, y: targetY },
        });
      }
    });
  }
  // activate
  public onActivate(): void {
    this.inputMapper.switchContext("encounter");

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

  public handlePlayerAction(action: CombatAction): void {
    const encounter = this.store.get().game.encounter;
    if (!encounter || encounter.isResolved) return;

    const targetId = action.targetId ?? encounter.activeEnemyInstanceId;
    if (!targetId) {
      console.warn("[EncounterScene] No valid target for player action:", action);
      return;
    }
    console.log("[EncounterScene] Dispatching player action to queueManager:", action);
    this.queueManager.enqueuePlayerAction(action, targetId);
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

  // Inside EncounterScene.ts -> updateActorPositions()

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
        enemyActor.kill(); // Remove dead/fled enemy actors from Excalibur scene
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
