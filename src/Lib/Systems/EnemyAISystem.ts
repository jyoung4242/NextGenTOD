// Systems/EnemyAISystem.ts
import { GameState, CombatAction, EnemyState, TacticalPosition } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";

export class EnemyAISystem {
  constructor(private readonly contentRegistry: ContentRegistry) {}

  /**
   * Decides the next combat action for a given enemy participant.
   */
  public selectAction(enemyInstanceId: string, state: GameState): CombatAction {
    const encounter = state.game.encounter;
    const enemyState: EnemyState | undefined = state.dungeon?.enemies?.[enemyInstanceId];

    if (!enemyState || !enemyState.alive || enemyState.hp <= 0) {
      return { type: "defend" };
    }

    const enemyDef = this.contentRegistry.getEnemy(enemyState.definitionId);
    const maxHp = enemyDef?.health ?? enemyState.maxHp ?? 30;
    const healthRatio = enemyState.hp / maxHp;

    // Tactical positions with fallbacks to dungeon entity coordinates
    const enemyPos: TacticalPosition = encounter?.enemyPositions?.[enemyInstanceId] ?? enemyState.position;
    const playerPos: TacticalPosition = encounter?.playerPosition ?? state.player.position;

    // ─── 1. FLEE CONDITION ───────────────────────────────────────────────────
    // Critical health (< 15%) and non-boss units attempt to flee
    if (healthRatio < 0.15 && enemyDef?.id !== "boss") {
      const fleeTile = this.getFleeStep(enemyPos, playerPos, encounter?.arenaBounds);
      return {
        type: "flee",
        targetTile: fleeTile,
      };
    }

    // ─── 2. HEAL CONDITION ───────────────────────────────────────────────────
    // Low health (< 30%) with healing abilities available
    if (healthRatio < 0.3 && enemyDef?.abilities?.includes("heal")) {
      return {
        type: "skill",
        skillId: "enemy_heal",
        targetId: enemyInstanceId,
        targetTile: enemyPos,
      };
    }

    const distance = this.getManhattanDistance(enemyPos, playerPos);
    const hasRangedSkill = enemyDef?.abilities?.some((a: string) => ["fireball", "lightning", "shoot", "range"].includes(a));

    // ─── 3. MOVEMENT CONDITION ───────────────────────────────────────────────
    // If target is out of melee range (> 1 tile away) and enemy has no ranged skill, approach
    if (!hasRangedSkill && distance > 1) {
      return {
        type: "move",
        targetTile: this.getNextStepTowards(enemyPos, playerPos),
      };
    }

    // ─── 4. RANGED / SPELL CONDITION ─────────────────────────────────────────
    if (hasRangedSkill && distance <= 4 && Math.random() < 0.6) {
      const spellId = enemyDef?.abilities?.find((a: string) => ["fireball", "lightning", "shoot"].includes(a)) ?? "shoot";

      return {
        type: "spell",
        skillId: spellId,
        targetId: "player",
        targetTile: playerPos,
      };
    }

    // ─── 5. MELEE ATTACK FALLBACK ───────────────────────────────────────────
    return {
      type: "attack",
      targetId: "player",
      targetTile: playerPos,
    };
  }

  // ─── Helper Functions ──────────────────────────────────────────────────────

  private getManhattanDistance(posA: TacticalPosition, posB: TacticalPosition): number {
    return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
  }

  private getNextStepTowards(from: TacticalPosition, to: TacticalPosition): TacticalPosition {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
      return { x: from.x + Math.sign(dx), y: from.y };
    } else {
      return { x: from.x, y: from.y + Math.sign(dy) };
    }
  }

  private getFleeStep(
    from: TacticalPosition,
    awayFrom: TacticalPosition,
    bounds?: { minX: number; maxX: number; minY: number; maxY: number },
  ): TacticalPosition {
    const dx = from.x - awayFrom.x;
    const dy = from.y - awayFrom.y;

    let targetX = from.x + (dx === 0 ? (Math.random() < 0.5 ? 1 : -1) : Math.sign(dx));
    let targetY = from.y + (dy === 0 ? (Math.random() < 0.5 ? 1 : -1) : Math.sign(dy));

    if (bounds) {
      targetX = Math.max(bounds.minX, Math.min(bounds.maxX, targetX));
      targetY = Math.max(bounds.minY, Math.min(bounds.maxY, targetY));
    }

    return { x: targetX, y: targetY };
  }
}
