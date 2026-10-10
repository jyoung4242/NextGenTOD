// Content/Enemies/test-enemies.ts
import { EnemyDefinition } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const TEST_ENEMIES: EnemyDefinition[] = [
  {
    id: "goblin",
    name: "Goblin Scout",
    avatarKey: "goblin",
    textureKey: "goblinLarge",
    health: 30,
    attack: 8,
    defense: 2,
    detectionRadius: 3,
    yOffset: 0.2, // Adjust the offset to raise the sprite above the floor
  },
  {
    id: "skeleton_warrior",
    name: "Skeleton Warrior",
    avatarKey: "skeleton",
    textureKey: "skeletonLarge",
    health: 50,
    attack: 14,
    defense: 5,
    detectionRadius: 4,
    yOffset: 0.2, // Adjust the offset to raise the sprite above the floor
  },
  {
    id: "dungeon_orc",
    name: "Dungeon Orc",
    avatarKey: "dungeon_orc",
    textureKey: "dungeon_orcLarge",
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
