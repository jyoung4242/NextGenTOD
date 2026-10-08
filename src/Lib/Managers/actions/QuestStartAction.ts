import { globalEvents } from "../../../Events/GlobalEvents";
import { CutsceneStep } from "../types";

/**
 * Reuses the existing "dialogue:starts-quest" event rather than inventing a
 * parallel "cutscene:starts-quest" one -- QuestManager already subscribes
 * to this event and doesn't care about origin, the same way
 * "world:flag-set" doesn't care who set the flag. The event name is a
 * historical artifact of dialogue being the first system to trigger
 * quests; kept as-is per the project's own convention of not renaming
 * things without updating every call site in one pass. Worth a dedicated
 * rename (e.g. to "quest:request-start") later if the naming becomes
 * confusing, but not as a drive-by here.
 */
export class QuestStartAction implements CutsceneStep {
  private _done = false;

  constructor(private readonly _questId: string) {}

  update(): void {
    if (this._done) return;
    globalEvents.emit("dialogue:starts-quest", { questId: this._questId });
    this._done = true;
  }

  isComplete(): boolean {
    return this._done;
  }

  reset(): void {
    this._done = false;
  }

  stop(): void {}
}
