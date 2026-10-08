import { CutsceneStep } from "../types";

export class WaitAction implements CutsceneStep {
  private _elapsed = 0;

  constructor(private readonly _durationMs: number) {}

  update(elapsed: number): void {
    this._elapsed += elapsed;
  }

  isComplete(): boolean {
    return this._elapsed >= this._durationMs;
  }

  reset(): void {
    this._elapsed = 0;
  }

  stop(): void {}
}
