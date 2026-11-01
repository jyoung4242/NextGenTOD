// Systems/SkillDisplayUtility.ts
import { GameState, SkillDefinition } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";
import { SkillProgressionUtility } from "./SkillProgressionUtility";

export interface SkillDisplayModel {
  id: string;
  name: string;
  category: string;
  level: number;
  currentXp: number;
  xpNeededForNext: number;
  progressPercent: number; // 0 to 100 representing progress to NEXT level
  isMaxLevel: boolean;
}

export class SkillDisplayUtility {
  /**
   * Returns a fully populated, sorted list of all skills for the character UI,
   * combining static definitions with the player's runtime levels and XP.
   */
  public static getPlayerSkillDisplays(state: GameState, contentRegistry: ContentRegistry): SkillDisplayModel[] {
    const allSkillDefs = contentRegistry.getAllSkills() ?? [];
    const playerSkills = state.player.skills ?? {};

    return allSkillDefs.map((def: SkillDefinition) => {
      const skillState = playerSkills[def.id] ?? { level: 1, xp: 0 };
      const level = skillState.level;
      const currentXp = skillState.xp;

      const isMaxLevel = level >= 100;

      // Actions/XP needed to go from current level to level + 1
      const xpNeededForNext = isMaxLevel ? 0 : SkillProgressionUtility.getActionsNeededForNextLevel(level);

      // Calculate progress percentage strictly for the current level step (0 - 100%)
      const progressPercent = isMaxLevel ? 100 : Math.min(100, Math.floor((currentXp / xpNeededForNext) * 100));

      return {
        id: def.id,
        name: def.name,
        category: def.category,
        level,
        currentXp,
        xpNeededForNext,
        progressPercent,
        isMaxLevel,
      };
    });
  }
}
