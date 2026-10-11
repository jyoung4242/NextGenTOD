// Systems/EncounterTrigger.ts
import { StateStore } from "../../GameState";
import { GameState } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";

export class EncounterTriggerSystem {
  constructor(
    private readonly store: StateStore<GameState>,
    private readonly contentRegistry: ContentRegistry, // Pass registry to access static grid bounds
  ) {}

  public checkAndTriggerEncounter(triggeredEnemyInstanceId: string): boolean {
    const state = this.store.get();
    if (state.game.mode === "encounter") return false;

    const enemy = state.dungeon?.enemies?.[triggeredEnemyInstanceId];
    if (!enemy || !enemy.alive) return false;

    const px = Math.floor(state.player.position.x);
    const py = Math.floor(state.player.position.y);

    // Fetch the static dungeon definition using the current dungeon id
    const dungeonDef = this.contentRegistry.getDungeon(state.dungeon.definitionId);

    // Set arena bounds to span the entire dungeon grid dimensions from ASCII layout
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

    this.store.batch(ctx => {
      ctx.set("game.mode", "encounter");
      ctx.set("game.encounter", {
        activeEnemyInstanceId: triggeredEnemyInstanceId,
        currentTurn: "player",
        turnCount: 1,
        arenaBounds, // Now covers the entire map!
        playerPosition: { x: px, y: py },
        enemyPositions: {
          [triggeredEnemyInstanceId]: {
            x: Math.floor(enemy.position.x),
            y: Math.floor(enemy.position.y),
          },
        },
        combatLog: [`Encounter initiated across the full dungeon map!`],
        isResolved: false,
      });
    });

    return true;
  }
}
