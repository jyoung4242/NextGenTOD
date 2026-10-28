// Systems/SkillProgressionUtility.ts

export class SkillProgressionUtility {
  /**
   * Calculates how many successful actions are needed to advance from level L to L + 1
   */
  public static getActionsNeededForNextLevel(level: number): number {
    if (level >= 100) return Infinity; // Max level reached
    return Math.floor(10 + 2.5 * level + 0.05 * Math.pow(level, 2));
  }

  /**
   * Processes a successful skill action (+1 progress) and handles level-ups
   */
  public static awardSkillAction(currentLevel: number, currentXp: number): { level: number; xp: number; leveledUp: boolean } {
    let level = currentLevel;
    let xp = currentXp + 1; // Each successful action increases skill progress by 1
    let leveledUp = false;

    let actionsNeeded = this.getActionsNeededForNextLevel(level);

    // Support multi-level jumps if a massive action reward ever occurs
    while (level < 100 && xp >= actionsNeeded) {
      xp -= actionsNeeded;
      level += 1;
      leveledUp = true;
      actionsNeeded = this.getActionsNeededForNextLevel(level);
    }

    if (level >= 100) {
      level = 100;
      xp = 0; // Cap at max level
    }

    return { level, xp, leveledUp };
  }
}
