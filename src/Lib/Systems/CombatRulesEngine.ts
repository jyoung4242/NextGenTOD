// Systems/CombatRulesEngine.ts
import { PlayerState, EnemyState, EnemyDefinition } from "../../GameTypes";

export interface AttackRollResult {
  roll: number;
  totalAttack: number;
  defenseValue: number;
  isHit: boolean;
  isCrit: boolean;
  damage: number;
  logMessage: string;
}

export interface DefenseRollResult {
  mitigatedDamage: number;
  isBlocked: boolean;
  counterDamage: number;
  logMessage: string;
}

export class CombatRulesEngine {
  /**
   * Helper: Derives player offensive power dynamically from skills.
   */
  public static getPlayerAttackPower(player: PlayerState): number {
    const oneHandedLevel = player.skills?.["oneHanded"]?.level ?? 1;
    // Base attribute equivalent + skill contribution
    return 2 + Math.floor(oneHandedLevel * 1.5);
  }

  /**
   * Helper: Derives player defensive armor class / mitigation dynamically from block skill.
   */
  public static getPlayerDefenseRating(player: PlayerState): number {
    const blockLevel = player.skills?.["block"]?.level ?? 1;
    // Base armor + skill contribution
    return 1 + Math.floor(blockLevel / 2);
  }

  /**
   * Evaluates a physical melee attack using a d20 roll system, factoring in skill-derived stats.
   */
  public static resolveMeleeAttack(player: PlayerState, enemy: EnemyState, enemyDef?: EnemyDefinition): AttackRollResult {
    // 1. Roll 1d20
    const roll = Math.floor(Math.random() * 20) + 1;
    const isCrit = roll === 20;
    const isFumble = roll === 1;

    // 2. Gather derived modifiers from skills
    const oneHandedLevel = player.skills?.["oneHanded"]?.level ?? 1;
    const attackModifier = CombatRulesEngine.getPlayerAttackPower(player);
    const totalAttack = roll + attackModifier;

    // 3. Enemy Defense / Armor Class (AC) approximation
    const targetArmorClass = 10 + (enemyDef?.defense ?? 2);

    // 4. Hit determination
    let isHit = false;
    if (isFumble) {
      isHit = false;
    } else if (isCrit || totalAttack >= targetArmorClass) {
      isHit = true;
    }

    if (!isHit) {
      return {
        roll,
        totalAttack,
        defenseValue: targetArmorClass,
        isHit: false,
        isCrit: false,
        damage: 0,
        logMessage: `Rolled ${roll} (${totalAttack} vs AC ${targetArmorClass}) - Attack missed!`,
      };
    }

    // 5. Damage Calculation using skill-based scaling
    const baseWeaponDamage = 6;
    const strengthBonus = Math.floor(oneHandedLevel / 3);
    let rawDamage = baseWeaponDamage + strengthBonus;

    if (isCrit) {
      rawDamage *= 2; // Critical hit double damage
    }

    // Apply minor mitigation from enemy defense floor
    const mitigation = Math.floor((enemyDef?.defense ?? 2) / 2);
    const finalDamage = Math.max(1, rawDamage - mitigation);

    const critText = isCrit ? " Critical Hit!" : "";
    const enemyName = enemyDef?.name ?? "Enemy";

    return {
      roll,
      totalAttack,
      defenseValue: targetArmorClass,
      isHit: true,
      isCrit,
      damage: finalDamage,
      logMessage: `Rolled ${roll}${critText} (${totalAttack} vs AC ${targetArmorClass})! Dealt ${finalDamage} damage to ${enemyName}.`,
    };
  }

  /**
   * Resolves enemy counter-attack damage against the player, factoring in block-derived defense.
   */
  public static resolveEnemyAttack(enemyDef?: EnemyDefinition, player?: PlayerState): DefenseRollResult {
    const baseAttack = enemyDef?.attack ?? 5;
    const playerDefense = player ? CombatRulesEngine.getPlayerDefenseRating(player) : 1;

    // Simple variance for enemy attack roll
    const variance = Math.floor(Math.random() * 3);
    const rawDamage = baseAttack + variance;
    const mitigatedDamage = Math.max(1, rawDamage - playerDefense);

    const enemyName = enemyDef?.name ?? "Enemy";
    return {
      mitigatedDamage,
      isBlocked: false,
      counterDamage: 0,
      logMessage: `${enemyName} counter-attacks for ${mitigatedDamage} damage (Mitigated by ${playerDefense} defense)!`,
    };
  }
}
