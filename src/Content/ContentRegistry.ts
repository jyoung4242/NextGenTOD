import { DungeonDefinition, EnemyDefinition, ItemDefinition, SkillDefinition, QuestDefinitionData } from "../GameTypes";
import { CutsceneManifest } from "../Lib/Managers/CutScenes";

export class ContentRegistry {
  readonly dungeons = new Map<string, DungeonDefinition>();
  readonly enemies = new Map<string, EnemyDefinition>();
  readonly items = new Map<string, ItemDefinition>();
  readonly skills = new Map<string, SkillDefinition>();
  readonly quests = new Map<string, QuestDefinitionData>();
  readonly cutscenes = new Map<string, CutsceneManifest>();

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

  registerQuest(definition: QuestDefinitionData): void {
    this.register(this.quests, definition, "quest");
  }

  registerCutscene(definition: CutsceneManifest): void {
    this.register(this.cutscenes, definition, "cutscene");
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

  // Add getQuest
  getQuest(id: string): QuestDefinitionData {
    const definition = this.quests.get(id);

    if (!definition) {
      throw new Error(`Unknown quest: ${id}`);
    }

    return definition;
  }

  getCutscene(id: string): CutsceneManifest {
    const definition = this.cutscenes.get(id);
    if (!definition) {
      throw new Error(`Unknown cutscene: ${id}`);
    }
    return definition;
  }
}
