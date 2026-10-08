import { CutsceneStep } from "../types";

/**
 * Loose structural interface rather than importing AnimationComponent<T>
 * directly -- avoids binding this file to PlayerActor's specific animation
 * key union, since NPC actors will have their own animation key sets.
 */
export interface AnimatableActor {
  AC?: {
    currentName: string | null;
    set(name: string): void;
  };
}

/**
 * Animations have no native "done" signal the way moveTo/toPromise does,
 * so this step just sets the animation once and holds for durationMs.
 */
export class AnimateAction implements CutsceneStep {
  private _applied = false;
  private _elapsed = 0;

  constructor(
    private readonly _actor: AnimatableActor,
    private readonly _animationName: string,
    private readonly _holdMs: number,
  ) {}

  update(elapsed: number): void {
    if (!this._applied) {
      this._actor.AC?.set(this._animationName);
      this._applied = true;
    }
    this._elapsed += elapsed;
  }

  isComplete(): boolean {
    return this._elapsed >= this._holdMs;
  }

  reset(): void {
    this._applied = false;
    this._elapsed = 0;
  }

  stop(): void {}
}
