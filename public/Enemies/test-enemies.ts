// Content/Enemies/test-enemies.ts
import { EnemyDefinition } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const TEST_ENEMIES: EnemyDefinition[] = [
  {
    id: "goblin_scout",
    name: "Goblin Scout",
    spriteUrl: "assets/sprites/goblin_scout.png",
    health: 30,
    attack: 8,
    defense: 2,
    detectionRadius: 3,
  },
  {
    id: "skeleton_warrior",
    name: "Skeleton Warrior",
    spriteUrl: "assets/sprites/skeleton_warrior.png",
    health: 50,
    attack: 14,
    defense: 5,
    detectionRadius: 4,
  },
  {
    id: "dungeon_orc",
    name: "Dungeon Orc",
    spriteUrl: "assets/sprites/dungeon_orc.png",
    health: 80,
    attack: 20,
    defense: 8,
    detectionRadius: 2,
  },
];

/**
 * Registers all test enemy definitions into the ContentRegistry.
 */
export function registerTestEnemies(registry: ContentRegistry): void {
  TEST_ENEMIES.forEach(enemy => registry.registerEnemy(enemy));
}
