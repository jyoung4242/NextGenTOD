import { Camera, vec } from "excalibur";
import { CameraStepDef, CutsceneStep } from "../types";

/**
 * Verified against the real installed Excalibur version (0.33.0-alpha.168):
 *   camera.move(pos, durationMs, easingFn?): Promise<Vector>
 *   camera.zoomOverTime(scale, durationMs?, easingFn?): Promise<boolean>
 *   camera.shake(magnitudeX, magnitudeY, durationMs): void  <- fire-and-forget,
 *     no promise, so "shake" tracks its own elapsed time the same way
 *     WaitAction does, rather than relying on a timer.
 */
export class CameraAction implements CutsceneStep {
  private _started = false;
  private _done = false;
  private _shakeElapsed = 0;

  constructor(
    private readonly _camera: Camera,
    private readonly _def: CameraStepDef,
  ) {}

  update(elapsed: number): void {
    if (!this._started) {
      this._started = true;
      this._start();
    }

    if (this._def.mode === "shake") {
      this._shakeElapsed += elapsed;
      if (this._shakeElapsed >= (this._def.durationMs ?? 0)) {
        this._done = true;
      }
    }
  }

  private _start(): void {
    switch (this._def.mode) {
      case "pan":
      case "focus": {
        const target = vec(this._def.x ?? 0, this._def.y ?? 0);
        this._camera.move(target, this._def.durationMs ?? 0).then(() => {
          this._done = true;
        });
        break;
      }
      case "zoom": {
        this._camera.zoomOverTime(this._def.zoom ?? 1, this._def.durationMs ?? 0).then(() => {
          this._done = true;
        });
        break;
      }
      case "shake": {
        this._camera.shake(this._def.magnitudeX ?? 0, this._def.magnitudeY ?? 0, this._def.durationMs ?? 0);
        break;
      }
    }
  }

  isComplete(): boolean {
    return this._done;
  }

  reset(): void {
    this._started = false;
    this._done = false;
    this._shakeElapsed = 0;
  }

  stop(): void {}
}
