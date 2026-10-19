// Systems/EncounterTrigger.ts
import { StateStore } from "../../GameState";
import { GameState } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";

export class EncounterTriggerSystem {
  constructor(
    private readonly store: StateStore<GameState>,
    private readonly contentRegistry: ContentRegistry,
  ) {}

  public checkAndTriggerEncounter(triggeredEnemyInstanceId: string): boolean {
    const state = this.store.get();
    if (state.game.mode === "encounter") return false;

    // 1. Resolve active dungeon ID and active dungeon runtime state from the registry
    const activeDungeonId = state.dungeon.current;
    const activeDungeonState = state.dungeon.registry[activeDungeonId];
    if (!activeDungeonState) return false;

    const enemy = activeDungeonState.enemies?.[triggeredEnemyInstanceId];
    if (!enemy || !enemy.alive) return false;

    const px = Math.floor(state.player.position.x);
    const py = Math.floor(state.player.position.y);

    // Fetch the static dungeon definition using the active dungeon ID
    const dungeonDef = this.contentRegistry.getDungeon(activeDungeonId);

    // Arena bounds covering the full dungeon grid layout
    const arenaBounds = dungeonDef
      ? {
          minX: 0,
          maxX: dungeonDef.grid.width - 1,
          minY: 0,
          maxY: dungeonDef.grid.height - 1,
        }
      : {
          minX: 0,
          maxX: 15,
          minY: 0,
          maxY: 10,
        };

    const enemyInstanceIds: string[] = [];
    const enemyPositions: Record<string, { x: number; y: number }> = {};
    if (dungeonDef && dungeonDef.nodes && activeDungeonState.enemies) {
      const ex = Math.floor(enemy.position.x);
      const ey = Math.floor(enemy.position.y);

      // 1. Find the node that the triggered enemy is occupying based on its coordinates
      let triggeredNode: any | undefined;
      for (const node of Object.values(dungeonDef.nodes)) {
        if (
          ex >= node.bounds.x &&
          ex < node.bounds.x + node.bounds.width &&
          ey >= node.bounds.y &&
          ey < node.bounds.y + node.bounds.height
        ) {
          triggeredNode = node;
          break;
        }
      }

      // 2. Gather all living enemies inside that same node's bounds from the active dungeon state
      for (const [id, enemyState] of Object.entries(activeDungeonState.enemies)) {
        if (!enemyState.alive) continue;

        const otherEx = Math.floor(enemyState.position.x);
        const otherEy = Math.floor(enemyState.position.y);

        let isInSameNode = false;
        if (triggeredNode) {
          isInSameNode =
            otherEx >= triggeredNode.bounds.x &&
            otherEx < triggeredNode.bounds.x + triggeredNode.bounds.width &&
            otherEy >= triggeredNode.bounds.y &&
            otherEy < triggeredNode.bounds.y + triggeredNode.bounds.height;
        } else {
          // Fallback if enemy isn't mapped to specific node bounds
          isInSameNode = id === triggeredEnemyInstanceId;
        }

        if (isInSameNode) {
          enemyInstanceIds.push(id);
          enemyPositions[id] = {
            x: otherEx,
            y: otherEy,
          };
        }
      }
    } else {
      // Fallback if no nodes are defined in the dungeon
      enemyInstanceIds.push(triggeredEnemyInstanceId);
      enemyPositions[triggeredEnemyInstanceId] = {
        x: Math.floor(enemy.position.x),
        y: Math.floor(enemy.position.y),
      };
    }

    this.store.batch(ctx => {
      ctx.set("game.mode", "encounter");
      ctx.set("game.encounter", {
        enemyInstanceIds,
        activeEnemyInstanceId: triggeredEnemyInstanceId,
        currentTurn: "player",
        turnCount: 1,
        arenaBounds,
        playerPosition: { x: px, y: py },
        enemyPositions,
        combatLog: [`Encounter initiated with ${enemyInstanceIds.length} enemies in the room!`],
        isResolved: false,
      });
    });

    return true;
  }
}
