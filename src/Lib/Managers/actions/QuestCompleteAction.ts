import { globalEvents } from "../../../Events/GlobalEvents";
import { CutsceneStep } from "../types";

/** See the comment in QuestStartAction.ts -- same reuse-of-existing-event reasoning. */
export class QuestCompleteAction implements CutsceneStep {
  private _done = false;

  constructor(private readonly _questId: string) {}

  update(): void {
    if (this._done) return;
    globalEvents.emit("dialogue:completes-quest", { questId: this._questId });
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
