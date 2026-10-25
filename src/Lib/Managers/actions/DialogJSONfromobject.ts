import { DialogRunner } from "../../../Lib/Managers/DialogRunner";
import { DialogLoader } from "../../../Lib/Managers/DialogLoader";
import { DialogUI } from "../../../UI/DialogUI";
import { StateStore } from "../../../GameState";
import { GameState } from "../../../GameTypes";
import { Action, nextActionId, Scene } from "excalibur";

export class DialogJSONActionFromObject implements Action {
  id: number = nextActionId();
  private _started = false;
  private _done = false;
  private runner: DialogRunner | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly dialogUI: DialogUI,
    private readonly store: StateStore<GameState>,
    private readonly dialogData: unknown, // Accepts the raw JSON dialog object directly
  ) {}

  public isComplete(): boolean {
    this._done = this.runner?.isConversationFinished() ?? false;
    return this._done;
  }

  update(elapsed: number): void {
    if (!this._started) {
      // Create the loader using the fromJSON factory method
      const jsonLoader = DialogLoader.fromJSON(this.dialogData);

      // Initialize the runner with UI, the JSON-based loader, and the state store
      this.runner = new DialogRunner(this.dialogUI, jsonLoader);

      void this.runner.start();
      this._started = true;
      this.scene.add(this.dialogUI);
    }

    if (this.isComplete()) {
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
