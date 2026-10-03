import { Keys } from "excalibur";
import { DungeonPlayer } from "../../Actors/DungeonPlayer";
import { INPUT_CONTEXT } from "../../main";
import { InputMapSystem } from "../Systems/InputMapper";

export class DungeonPlayerController {
  constructor(
    private readonly input: InputMapSystem,
    private readonly player: DungeonPlayer,
  ) {}

  initialize(): void {
    this.input.inputMapEmitter.on("keyPress", this.handleKeyPress);
  }

  dispose(): void {
    this.input.inputMapEmitter.off("keyPress", this.handleKeyPress);
  }

  private handleKeyPress = (event: { ctx: string; key: Keys }): void => {
    console.log("keypress: ", event.key);

    if (event.ctx !== INPUT_CONTEXT.Dungeon) {
      return;
    }

    switch (event.key) {
      case Keys.W:
        this.player.moveForward();
        break;

      case Keys.S:
        this.player.moveBackward();
        break;

      case Keys.A:
        this.player.turnLeft();
        break;

      case Keys.D:
        this.player.turnRight();
        break;

      case Keys.E:
        this.player.interact();
        break;
    }
  };
}
