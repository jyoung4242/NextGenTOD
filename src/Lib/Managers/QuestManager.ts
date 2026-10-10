// Lib/quests/QuestManager.ts
import { StateStore } from "../../GameState";
import { GameState, ObjectiveProgress, QuestProgress, ObjectiveType, QuestDefinitionData, QuestState } from "../../GameTypes";
import { QuestLoader } from "./QuestLoader";

export class QuestManager {
  private definitions = new Map<string, QuestDefinitionData>();

  constructor(private readonly store: StateStore<GameState>) {}

  async registerQuest(path: string): Promise<QuestDefinitionData> {
    const def = await new QuestLoader(path).load();
    this.definitions.set(def.id, def);
    return def;
  }

  registerQuestData(def: QuestDefinitionData): void {
    this.definitions.set(def.id, def);
  }

  public startQuest(questId: string): void {
    const def = this.definitions.get(questId);
    if (!def) {
      console.warn(`QuestManager: startQuest("${questId}") — quest not registered`);
      return;
    }

    const currentQuests = this.store.get("quests");
    if (currentQuests.active[questId] || currentQuests.completed.includes(questId)) return;

    const objectives: ObjectiveProgress[] = def.objectives.map(o => ({
      id: o.id,
      current: 0,
      target: o.count,
      complete: false,
    }));

    const progress: QuestProgress = {
      questId,
      state: "active",
      objectives,
    };

    this.store.batch(ctx => {
      ctx.set(`quests.active.${questId}` as any, progress);

      for (const flag of def.triggers?.onStart?.setsFlag ?? []) {
        ctx.set(`quests.flags.${flag}` as any, true);
      }
      for (const flag of def.worldFlags?.sets ?? []) {
        ctx.set(`quests.flags.${flag}` as any, true);
      }
    });

    // 📍 LOG: QUEST STARTED
    console.log(
      `%c[Quest Started]%c ${def.metadata.title || questId}`,
      "color: #4caf50; font-weight: bold;",
      "color: inherit;",
      progress,
    );
  }

  public completeQuest(questId: string): void {
    const def = this.definitions.get(questId);
    const activeQuest = this.store.get("quests").active[questId];

    if (!def || !activeQuest) {
      console.warn(`QuestManager: completeQuest("${questId}") — quest not active`);
      return;
    }

    this.store.batch(ctx => {
      const quests = this.store.get("quests");
      const nextActive = { ...quests.active };
      delete nextActive[questId];

      ctx.set("quests.active", nextActive);
      ctx.set("quests.completed", [...quests.completed, questId]);

      for (const flag of def.triggers?.onComplete?.setsFlag ?? []) {
        ctx.set(`quests.flags.${flag}` as any, true);
      }
    });

    // 📍 LOG: QUEST COMPLETED
    console.log(`%c[Quest Completed]%c ${def.metadata.title || questId}`, "color: #ffd700; font-weight: bold;", "color: inherit;");
  }

  public getQuestState(questId: string): QuestState {
    const quests = this.store.get("quests");
    if (quests.completed.includes(questId)) return "complete";
    if (quests.active[questId]) return "active";
    return "not_started";
  }

  /**
   * Called directly by game systems (Combat, Interaction, Dialogue)
   */
  public progressObjectives(type: ObjectiveType, target: string, amount = 1): void {
    const activeQuests = this.store.get("quests").active;

    for (const [questId, prog] of Object.entries(activeQuests)) {
      const def = this.definitions.get(questId);
      if (!def) continue;

      let updated = false;
      const nextObjectives = prog.objectives.map(objProg => {
        const objDef = def.objectives.find(o => o.id === objProg.id);
        if (!objDef || objDef.type !== type || objDef.target !== target || objProg.complete) {
          return objProg;
        }

        updated = true;
        const newCurrent = Math.min(objProg.current + amount, objProg.target);
        const isComplete = newCurrent >= objProg.target;

        // 📍 LOG: OBJECTIVE UPDATED
        console.log(
          `%c[Quest Objective Progress]%c Quest "${questId}" | ${objDef.description}: ${newCurrent}/${objProg.target}` +
            (isComplete ? " (COMPLETE)" : ""),
          "color: #2196f3; font-weight: bold;",
          "color: inherit;",
        );

        return {
          ...objProg,
          current: newCurrent,
          complete: isComplete,
        };
      });

      if (updated) {
        this.store.set(`quests.active.${questId}.objectives` as any, nextObjectives);
      }
    }
  }
}
