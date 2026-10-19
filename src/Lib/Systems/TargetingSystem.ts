// Systems/TargetingSystem.ts
import { GameState } from "../../GameTypes";

export class TargetingSystem {
  /**
   * Cycles to the next available living enemy in the encounter.
   * Useful for Tab on keyboard or Bumper/Stick flick on gamepads.
   */
  public static cycleTarget(state: GameState, direction: 1 | -1 = 1): string | undefined {
    const encounter = state.game.encounter;
    if (!encounter || !encounter.enemyInstanceIds) return undefined;

    const activeDungeonId = state.dungeon.current;
    const activeDungeonState = state.dungeon.registry?.[activeDungeonId];
    if (!activeDungeonState) return undefined;

    // Filter down to only living enemies with valid instances from active dungeon state
    const livingEnemyIds = encounter.enemyInstanceIds.filter(id => {
      const enemy = activeDungeonState.enemies?.[id];
      return enemy && enemy.alive && enemy.hp > 0;
    });

    if (livingEnemyIds.length === 0) return undefined;

    const currentId = encounter.currentTargetId ?? encounter.activeEnemyInstanceId ?? livingEnemyIds[0];
    const currentIndex = livingEnemyIds.indexOf(currentId);

    let nextIndex = (currentIndex + direction) % livingEnemyIds.length;
    if (nextIndex < 0) nextIndex = livingEnemyIds.length - 1;

    return livingEnemyIds[nextIndex];
  }

  /**
   * Finds the closest enemy to a specific coordinate (e.g., player position or reticle).
   */
  public static getNearestEnemyToTile(state: GameState, tile: { x: number; y: number }): string | undefined {
    const encounter = state.game.encounter;
    if (!encounter || !encounter.enemyPositions) return undefined;

    const activeDungeonId = state.dungeon.current;
    const activeDungeonState = state.dungeon.registry?.[activeDungeonId];
    if (!activeDungeonState) return undefined;

    let closestId: string | undefined;
    let minDistance = Infinity;

    for (const [id, pos] of Object.entries(encounter.enemyPositions)) {
      const enemy = activeDungeonState.enemies?.[id];
      if (!enemy || !enemy.alive) continue;

      const dist = Math.abs(pos.x - tile.x) + Math.abs(pos.y - tile.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestId = id;
      }
    }

    return closestId;
  }
}
