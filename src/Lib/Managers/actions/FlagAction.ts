import { worldState } from "../../world/WorldState";
import { CutsceneStep } from "../types";

/**
 * Calls worldState.setFlag() directly rather than emitting
 * "dialogue:sets-flag" -- that event name is dialogue-specific per the
 * comment in WorldState.ts, and setFlag() is already a public singleton
 * method, so there's no need to route through an event for this.
 */
export class FlagAction implements CutsceneStep {
  private _applied = false;

  constructor(private readonly _flag: string) {}

  update(): void {
    if (this._applied) return;
    worldState.setFlag(this._flag);
    this._applied = true;
  }

  isComplete(): boolean {
    return this._applied;
  }

  reset(): void {
    this._applied = false;
  }

  stop(): void {}
}
