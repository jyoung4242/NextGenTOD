// Systems/CombatRulesEngine.ts
import { PlayerState, EnemyState, EnemyDefinition } from "../../GameTypes";

export interface CombatEventResult {
  logmessage: string;
  structuredResult: {
    roll?: number;
    totalAttack?: number;
    defenseValue?: number;
    isHit?: boolean;
    isCrit?: boolean;
    damage?: number;
    healing?: number;
    isBlocked?: boolean;
    counterDamage?: number;
    targetId?: string;
    targetPos?: { x: number; y: number };
  };
}

export interface ThrowResolutionResult {
  isHit: boolean;
  damage: number;
  affectedTargets: { targetId: string; damage: number; newHp: number }[];
  log: CombatEventResult;
}

export interface AttackRollResult {
  roll: number;
  totalAttack: number;
  defenseValue: number;
  isHit: boolean;
  isCrit: boolean;
  damage: number;
  log: CombatEventResult;
}

export interface DefenseRollResult {
  mitigatedDamage: number;
  isBlocked: boolean;
  counterDamage: number;
  log: CombatEventResult;
}
export interface SpellResolutionResult {
  isHit: boolean;
  damageOrHealing: number;
  affectedTargets: { targetId: string; damage: number; newHp: number }[];
  log: CombatEventResult;
}

export class CombatRulesEngine {
  /**
   * Helper: Derives player offensive power dynamically from the given weapon skill.
   */
  public static getPlayerAttackPower(player: PlayerState, weaponSkillId: string = "oneHanded"): number {
    const skillLevel = player.skills?.[weaponSkillId]?.level ?? 1;
    // Base attribute equivalent + skill contribution
    return 2 + Math.floor(skillLevel * 1.5);
  }

  /**
   * Helper: Derives player defensive armor class / mitigation dynamically from block skill.
   */
  public static getPlayerDefenseRating(player: PlayerState): number {
    const blockLevel = player.skills?.["block"]?.level ?? 1;
    // Base armor + skill contribution
    return 1 + Math.floor(blockLevel / 2);
  }

  public static getPlayerSpellPower(player: PlayerState, skillCategory: string = "blackMagic"): number {
    const skillLevel = player.skills?.[skillCategory]?.level ?? 1;
    return 3 + Math.floor(skillLevel * 2.0);
  }

  /**
   * Evaluates a physical melee attack using a d20 roll system, factoring in weapon-skill-derived stats.
   */
  public static resolveMeleeAttack(
    player: PlayerState,
    enemy: EnemyState,
    enemyDef?: EnemyDefinition,
    weaponSkillId: string = "oneHanded",
  ): AttackRollResult {
    // 1. Roll 1d20
    const roll = Math.floor(Math.random() * 20) + 1;
    const isCrit = roll === 20;
    const isFumble = roll === 1;

    // 2. Gather derived modifiers from actively equipped weapon skill
    const skillLevel = player.skills?.[weaponSkillId]?.level ?? 1;
    const attackModifier = CombatRulesEngine.getPlayerAttackPower(player, weaponSkillId);
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
      console.log(`[CombatRulesEngine]: Attack missed!`, enemy);
      return {
        roll,
        totalAttack,
        defenseValue: targetArmorClass,
        isHit: false,
        isCrit: false,
        damage: 0,
        log: {
          logmessage: `Rolled ${roll} (${totalAttack} vs AC ${targetArmorClass}) - Attack missed!`,
          structuredResult: {
            roll,
            totalAttack,
            targetPos: enemy.position,
            defenseValue: targetArmorClass,
            isHit: false,
            isCrit: false,
            damage: 0,
          },
        },
      };
    }

    // 5. Damage Calculation using skill-based scaling
    const baseWeaponDamage = 6;
    const strengthBonus = Math.floor(skillLevel / 3);
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
      log: {
        logmessage: `Rolled ${roll}${critText} (${totalAttack} vs AC ${targetArmorClass})! Dealt ${finalDamage} damage to ${enemyName}.`,
        structuredResult: {
          roll,
          totalAttack,
          targetId: enemy.instanceId,
          defenseValue: targetArmorClass,
          isHit: true,
          isCrit,
          damage: finalDamage,
        },
      },
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
      log: {
        logmessage: `${enemyName} counter-attacks for ${mitigatedDamage} damage (Mitigated by ${playerDefense} defense)!`,
        structuredResult: {
          damage: mitigatedDamage,
          isBlocked: false,
          counterDamage: 0,
        },
      },
    };
  }

  public static resolveDirectSpell(
    player: PlayerState,
    spellDef: any,
    targetId: string,
    enemy: EnemyState,
    enemyDef?: EnemyDefinition,
  ): SpellResolutionResult {
    const spellPower = CombatRulesEngine.getPlayerSpellPower(player, spellDef.category);
    const basePower = spellDef.basePower ?? 20;

    // Magic hit roll or resistance mitigation
    const magicResistance = enemyDef?.defense ?? 2; // Can be expanded to magic resistance
    const rawDamage = basePower + spellPower;
    const finalDamage = Math.max(1, rawDamage - Math.floor(magicResistance / 2));

    const newHp = Math.max(0, enemy.hp - finalDamage);
    const enemyName = enemyDef?.name ?? "Enemy";

    return {
      isHit: true,
      damageOrHealing: finalDamage,
      affectedTargets: [{ targetId, damage: finalDamage, newHp }],
      log: {
        logmessage: `Player cast ${spellDef.name} on ${enemyName} for ${finalDamage} magical damage!`,
        structuredResult: {
          isHit: true,
          damage: finalDamage,
        },
      },
    };
  }

  /**
   * Resolves an Area of Effect (AoE) spell cast against all active enemies in the encounter.
   */
  public static resolveAoeSpell(
    player: PlayerState,
    spellDef: any,
    activeDungeonEnemies: Record<string, EnemyState>,
    enemyInstanceIds: string[],
    contentRegistry: any,
  ): SpellResolutionResult {
    const spellPower = CombatRulesEngine.getPlayerSpellPower(player, spellDef.category);
    const basePower = spellDef.basePower ?? 15;
    const affectedTargets: { targetId: string; damage: number; newHp: number }[] = [];

    for (const id of enemyInstanceIds) {
      const enemy = activeDungeonEnemies[id];
      if (!enemy || !enemy.alive || enemy.hp <= 0) continue;

      const enemyDef = contentRegistry.getEnemy(enemy.definitionId);
      const magicResistance = enemyDef?.defense ?? 2;
      const rawDamage = basePower + Math.floor(spellPower * 0.8); // Slight AoE damage spread reduction
      const finalDamage = Math.max(1, rawDamage - Math.floor(magicResistance / 2));
      const newHp = Math.max(0, enemy.hp - finalDamage);

      affectedTargets.push({ targetId: id, damage: finalDamage, newHp });
    }

    const totalTargetsHit = affectedTargets.length;
    return {
      isHit: true,
      damageOrHealing: basePower,
      affectedTargets,
      log: {
        logmessage: `Player unleashed AoE spell ${spellDef.name}, hitting ${totalTargetsHit} foes with raw magical energy!`,
        structuredResult: {
          isHit: true,
          damage: basePower,
        },
      },
    };
  }

  public static resolveThrow(
    player: PlayerState,
    itemId: string,
    targetId: string,
    enemy: EnemyState,
    enemyDef?: EnemyDefinition,
  ): ThrowResolutionResult {
    // 1. Roll 1d20 for accuracy
    const roll = Math.floor(Math.random() * 20) + 1;
    const isCrit = roll === 20;
    const isFumble = roll === 1;

    // Dexterity or general accuracy modifier (fallback to 2 if stats aren't mapped yet)
    const accuracyMod = 3;
    const totalAttack = roll + accuracyMod;
    const targetArmorClass = 10 + (enemyDef?.defense ?? 2);

    let isHit = false;
    if (!isFumble && (isCrit || totalAttack >= targetArmorClass)) {
      isHit = true;
    }

    const enemyName = enemyDef?.name ?? "Enemy";

    if (!isHit) {
      console.log(`[CombatRulesEngine]: Attack missed!`, enemy);
      return {
        isHit: false,
        damage: 0,
        affectedTargets: [],
        log: {
          logmessage: `Rolled ${roll} (${totalAttack} vs AC ${targetArmorClass}) - Thrown attack missed ${enemyName}!`,
          structuredResult: {
            roll,
            totalAttack,
            defenseValue: targetArmorClass,
            targetPos: enemy.position,
            isHit: false,
            isCrit: false,
            damage: 0,
          },
        },
      };
    }

    // 2. Base damage for thrown items (can be customized per itemId later)
    let rawDamage = 8;
    if (itemId === "throwing_dagger") rawDamage = 12;
    if (itemId === "fire_bomb") rawDamage = 18;
    if (isCrit) rawDamage *= 2;

    const mitigation = Math.floor((enemyDef?.defense ?? 2) / 2);
    const finalDamage = Math.max(1, rawDamage - mitigation);
    const newHp = Math.max(0, enemy.hp - finalDamage);

    const critText = isCrit ? " Critical Hit!" : "";

    return {
      isHit: true,
      damage: finalDamage,
      affectedTargets: [{ targetId, damage: finalDamage, newHp }],
      log: {
        logmessage: `Rolled ${roll}${critText} (${totalAttack} vs AC ${targetArmorClass})! Threw ${itemId} for ${finalDamage} damage to ${enemyName}.`,
        structuredResult: {
          roll,
          totalAttack,
          defenseValue: targetArmorClass,
          isHit: true,
          isCrit,
          targetId: enemy.instanceId,
          damage: finalDamage,
        },
      },
    };
  }
}
