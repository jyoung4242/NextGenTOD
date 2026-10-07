import { DungeonDefinition, EnemyDefinition, ItemDefinition, SkillDefinition } from "../GameTypes";

export class ContentRegistry {
  readonly dungeons = new Map<string, DungeonDefinition>();
  readonly enemies = new Map<string, EnemyDefinition>();
  readonly items = new Map<string, ItemDefinition>();
  readonly skills = new Map<string, SkillDefinition>();

  private register<T extends { id: string }>(registry: Map<string, T>, definition: T, type: string): void {
    if (registry.has(definition.id)) {
      throw new Error(`Duplicate ${type} definition: "${definition.id}"`);
    }

    registry.set(definition.id, definition);
  }

  registerDungeon(definition: DungeonDefinition): void {
    this.register(this.dungeons, definition, "dungeon");
  }

  registerEnemy(definition: EnemyDefinition): void {
    this.register(this.enemies, definition, "enemy");
  }

  registerItem(definition: ItemDefinition): void {
    this.register(this.items, definition, "item");
  }

  registerSkill(definition: SkillDefinition): void {
    this.register(this.skills, definition, "skill");
  }

  getDungeon(id: string): DungeonDefinition {
    const definition = this.dungeons.get(id);

    if (!definition) {
      throw new Error(`Unknown dungeon: ${id}`);
    }

    return definition;
  }

  getEnemy(id: string): EnemyDefinition {
    const definition = this.enemies.get(id);

    if (!definition) {
      throw new Error(`Unknown enemy: ${id}`);
    }

    return definition;
  }

  getItem(id: string): ItemDefinition {
    const definition = this.items.get(id);

    if (!definition) {
      throw new Error(`Unknown item: ${id}`);
    }

    return definition;
  }

  getSkill(id: string): SkillDefinition {
    const definition = this.skills.get(id);

    if (!definition) {
      throw new Error(`Unknown skill: ${id}`);
    }

    return definition;
  }
}
