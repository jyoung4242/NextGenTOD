import { CutsceneStep } from "../types";

export type DialogHandler = (dialogueTreeId: string) => Promise<void> | void;

/**
 * Thin seam -- DialogRunner.ts / DialogUI.ts weren't available when this
 * was written, so this doesn't reach into dialogue internals directly.
 * CutsceneManager is configured with a DialogHandler (likely something
 * that calls DialogueState.open() and drives the real DialogRunner,
 * resolving/calling back once the player has clicked through the tree).
 */
export class DialogAction implements CutsceneStep {
  private _started = false;
  private _done = false;

  constructor(
    private readonly _dialogueTreeId: string,
    private readonly _handler: DialogHandler,
  ) {}

  update(): void {
    if (this._started) return;
    this._started = true;

    const result = this._handler(this._dialogueTreeId);
    if (result instanceof Promise) {
      result.then(() => {
        this._done = true;
      });
    } else {
      this._done = true;
    }
  }

  isComplete(): boolean {
    return this._done;
  }

  reset(): void {
    this._started = false;
    this._done = false;
  }

  stop(): void {}
}
