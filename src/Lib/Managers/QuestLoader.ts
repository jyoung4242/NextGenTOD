import { ObjectiveType, type QuestDefinitionData } from "../../GameTypes";
const VALID_OBJECTIVE_TYPES: ObjectiveType[] = ["talk", "kill", "collect", "reach", "interact"];
const REQUIRED_QUEST_FIELDS = ["id", "metadata", "objectives", "rewards"];
const REQUIRED_OBJECTIVE_FIELDS = ["id", "description", "type", "target", "count"];

/**
 * Loads and validates quest definition JSON. Mirrors DialogLoader's
 * split between load() (fetch + parse) and buildQuest() (pure
 * validation + construction, testable without fetch).
 *
 * Path convention mirrors DialogLoader: quest JSON lives at
 * public/data/quests/<id>.json, served at /data/quests/<id>.json.
 * Accepts /public/data/quests/x.json, /data/quests/x.json, or
 * quests/x.json and normalizes to the served path.
 */
export class QuestLoader {
  constructor(private path: string) {}

  private normalizePath(path: string): string {
    let p = path.replace(/^\/public/, "");
    if (p.startsWith("/data/quests/")) return p;
    p = p.replace(/^\/?(data\/quests\/|quests\/)/, "");
    return `/data/quests/${p}`;
  }

  async load(): Promise<QuestDefinitionData> {
    const url = this.normalizePath(this.path);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`QuestLoader: failed to fetch ${url} (${res.status})`);
    }
    const payload = await res.json();
    return this.buildQuest(payload);
  }

  buildQuest(payload: unknown): QuestDefinitionData {
    if (typeof payload !== "object" || payload === null) {
      throw new Error("QuestLoader: payload is not an object");
    }
    const data = payload as Record<string, unknown>;

    for (const field of REQUIRED_QUEST_FIELDS) {
      if (!(field in data)) {
        throw new Error(`QuestLoader: missing required field "${field}"`);
      }
    }

    const objectives = data.objectives;
    if (!Array.isArray(objectives) || objectives.length === 0) {
      throw new Error("QuestLoader: objectives must be a non-empty array");
    }

    const seenIds = new Set<string>();
    for (const [i, obj] of objectives.entries()) {
      if (typeof obj !== "object" || obj === null) {
        throw new Error(`QuestLoader: objective[${i}] is not an object`);
      }
      const o = obj as Record<string, unknown>;
      for (const field of REQUIRED_OBJECTIVE_FIELDS) {
        if (!(field in o)) {
          throw new Error(`QuestLoader: objective[${i}] missing required field "${field}"`);
        }
      }
      if (!VALID_OBJECTIVE_TYPES.includes(o.type as any)) {
        throw new Error(
          `QuestLoader: objective[${i}] has invalid type "${o.type}" (expected one of ${VALID_OBJECTIVE_TYPES.join(", ")})`,
        );
      }
      if (seenIds.has(o.id as string)) {
        throw new Error(`QuestLoader: duplicate objective id "${o.id}"`);
      }
      seenIds.add(o.id as string);
    }

    return data as unknown as QuestDefinitionData;
  }
}
