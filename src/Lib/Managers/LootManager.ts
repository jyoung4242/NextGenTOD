export interface LootDrop {
  itemId: string;
  quantity: number;
}

export interface LootTableEntry {
  itemId: string;
  weight: number; // Probability weight
  minQty: number;
  maxQty: number;
  dropChance: number; // e.g. 0.75 for 75% chance
}

export class LootManager {
  private lootTables: Map<string, LootTableEntry[]> = new Map();

  constructor() {
    this.registerDefaultTables();
  }

  private registerDefaultTables() {
    // Example goblin / basic enemy loot table
    this.lootTables.set("table_basic_enemy", [
      { itemId: "gold_coins", weight: 50, minQty: 2, maxQty: 10, dropChance: 0.9 },
      { itemId: "potion_health_minor", weight: 20, minQty: 1, maxQty: 1, dropChance: 0.3 },
      { itemId: "iron_dagger", weight: 5, minQty: 1, maxQty: 1, dropChance: 0.05 },
    ]);
  }

  public generateLoot(tableId: string): LootDrop[] {
    const table = this.lootTables.get(tableId);
    if (!table) return [];

    const drops: LootDrop[] = [];

    for (const entry of table) {
      if (Math.random() <= entry.dropChance) {
        const quantity = Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty;
        drops.push({ itemId: entry.itemId, quantity });
      }
    }

    return drops;
  }
}
