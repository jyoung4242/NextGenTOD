// Systems/ProgressionSystem.ts

import { ContentRegistry } from "../../Content/ContentRegistry";
import { EnemyState } from "../../GameTypes";
import { LootManager, LootDrop } from "../Managers/LootManager";

export class ProgressionSystem {
  constructor(
    private lootManager: LootManager,
    private contentRegistry: ContentRegistry,
  ) {}

  public calculateEncounterRewards(enemyIds: string[], enemiesRegistry: Record<string, EnemyState>) {
    let totalXp = 0;
    const allLootDrops: LootDrop[] = [];

    for (const enemyId of enemyIds) {
      const enemy = enemiesRegistry[enemyId];
      if (!enemy) continue;

      const enemyDef = this.contentRegistry.getEnemy(enemy.definitionId);

      // 1. Accumulate XP (fallback to 25 if not defined in enemy definition)
      const enemyXp = enemyDef?.xpReward ?? 25;
      totalXp += enemyXp;

      // 2. Generate individual loot per enemy based on their loot table or a default table
      const tableId = enemyDef?.lootTableId ?? "table_basic_enemy";
      const drops = this.lootManager.generateLoot(tableId);
      allLootDrops.push(...drops);
    }

    return { totalXp, allLootDrops };
  }
}
