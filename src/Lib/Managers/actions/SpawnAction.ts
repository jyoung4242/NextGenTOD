import { Vector } from "excalibur";
import { CutsceneStep } from "../types";

export type SpawnHandler = (entityId: string, pos: Vector) => void;

/**
 * Thin seam -- there's no real spawn/entity-factory system to call into yet.
 * CutsceneManager is configured with a SpawnHandler at setup time (see
 * CutsceneManager.configure), which is expected to look up entityId in
 * whatever spawn registry exists and place it in the current scene.
 */
export class SpawnAction implements CutsceneStep {
  private _done = false;

  constructor(
    private readonly _entityId: string,
    private readonly _pos: Vector,
    private readonly _handler: SpawnHandler,
  ) {}

  update(): void {
    if (this._done) return;
    this._handler(this._entityId, this._pos);
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
