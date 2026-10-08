import { Actor, vec } from "excalibur";
import { CutsceneStep } from "../types";

/**
 * Delegates to the actor's real ActionsComponent (actor.actions.moveTo)
 * rather than reimplementing movement -- this keeps movement collision-aware
 * and physics-correct, driven by Excalibur's own per-actor update loop.
 * isComplete() just reflects actor.actions.toPromise() resolving.
 *
 * Assumes the target actor's action queue is otherwise idle when a cutscene
 * step starts (toPromise() resolves when the queue *as of the moveTo call*
 * finishes) -- CutsceneManager should clearActions() on cutscene actors
 * before queuing steps if that's not guaranteed.
 */
export class MoveAction implements CutsceneStep {
  private _started = false;
  private _done = false;

  constructor(
    private readonly _actor: Actor,
    private readonly _x: number,
    private readonly _y: number,
    private readonly _speed: number,
  ) {}

  update(): void {
    if (this._started) return;
    this._started = true;

    this._actor.actions.moveTo(vec(this._x, this._y), this._speed);
    this._actor.actions.toPromise().then(() => {
      this._done = true;
    });
  }

  isComplete(): boolean {
    return this._done;
  }

  reset(): void {
    this._started = false;
    this._done = false;
  }

  stop(): void {
    this._actor.actions.clearActions();
  }
}
