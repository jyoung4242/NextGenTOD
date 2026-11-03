// Systems/PlayerStatUtility.ts
import { GameState } from "../../GameTypes";

export class PlayerStatUtility {
  /**
   * Calculates Max HP based on Constitution, Strength, and relevant melee/defense skill levels.
   */
  public static calculateMaxHp(state: GameState): number {
    const constitution = state.player.constitution ?? 10;
    const strength = state.player.strength ?? 10;

    const skills = state.player.skills ?? {};
    const oneHandedLvl = skills["oneHanded"]?.level ?? 1;
    const blockLvl = skills["block"]?.level ?? 1;
    const heavyArmorLvl = skills["armorHeavy"]?.level ?? 1;
    const unarmedLvl = skills["unarmed"]?.level ?? 1;

    const baseHp = 80;
    const statBonus = constitution * 2 + strength * 2;
    const skillBonus = (oneHandedLvl + blockLvl + heavyArmorLvl + unarmedLvl) * 1.5;

    return Math.floor(baseHp + statBonus + skillBonus);
  }

  /**
   * Calculates Max Stamina based on Agility, Constitution, and physical skill levels.
   */
  public static calculateMaxStamina(state: GameState): number {
    const agility = state.player.agility ?? 10;
    const constitution = state.player.constitution ?? 10;

    const skills = state.player.skills ?? {};
    const rangedLvl = skills["ranged"]?.level ?? 1;
    const defenseLvl = skills["defense"]?.level ?? 1;

    const baseStam = 80;
    const statBonus = agility * 1 + constitution * 2;
    const skillBonus = (rangedLvl + defenseLvl) * 1.5;

    return Math.floor(baseStam + statBonus + skillBonus);
  }

  /**
   * Calculates Max Mana based on Wisdom and magical skill levels.
   */
  public static calculateMaxMana(state: GameState): number {
    const wisdom = state.player.wisdom ?? 10;

    const skills = state.player.skills ?? {};
    const destructionLvl = skills["blackMagic"]?.level ?? 1;
    const restorationLvl = skills["whiteMagic"]?.level ?? 1;
    const chaosLvl = skills["chaosMagic"]?.level ?? 1;

    const baseMana = 80;
    const statBonus = wisdom * 3;
    const skillBonus = (destructionLvl + restorationLvl + chaosLvl) * 2.0;

    return Math.floor(baseMana + statBonus + skillBonus);
  }
}
