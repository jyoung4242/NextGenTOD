// DialogAction.ts
import { DialogRunner } from "../DialogRunner";
import { DialogLoader } from "..//DialogLoader";
import { DialogUI } from "../../../UI/DialogUI";
import { Action, nextActionId, Scene } from "excalibur";

export class DialogAction implements Action {
  id: number = nextActionId();
  private _started = false;
  private _done = false;
  private runner: DialogRunner | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly dialogUI: DialogUI,
    private readonly dialogPath: string,
  ) {}

  public isComplete(): boolean {
    this._done = this.runner?.isConversationFinished() ?? false;
    return this._done;
  }

  update(elapsed: number): void {
    if (!this._started) {
      console.log(`Starting DialogAction with path: ${this.dialogPath}`);
      this.runner = new DialogRunner(this.dialogUI, new DialogLoader(this.dialogPath));
      this.runner.start();
      this._started = true;
      this.scene.add(this.dialogUI);
    }

    if (this.isComplete()) {
      console.log(`DialogAction with path: ${this.dialogPath} is complete.`);
      this.stop();
    }
  }

  reset(): void {
    this._started = false;
    this._done = false;
    this.runner = null;
  }

  stop(): void {
    this._done = true;
    if (this.runner) {
      this.scene.remove(this.dialogUI);
    }
  }
}
