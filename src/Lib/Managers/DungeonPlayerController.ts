import { Keys } from "excalibur";
import { DungeonPlayer } from "../../Actors/DungeonPlayer";
import { INPUT_CONTEXT } from "../../main";
import { InputMapSystem } from "../Systems/InputMapper";

export class DungeonPlayerController {
  constructor(
    private readonly input: InputMapSystem,
    private player: DungeonPlayer,
  ) {}

  initialize(): void {
    this.input.inputMapEmitter.on("keyPress", this.handleKeyPress);
    this.input.inputMapEmitter.on("gamepadButton", this.handleGamepadButtonPress);
  }

  dispose(): void {
    this.input.inputMapEmitter.off("keyPress", this.handleKeyPress);
    this.input.inputMapEmitter.off("gamepadButton", this.handleGamepadButtonPress);
  }

  private handleKeyPress = (event: { ctx: string; key: Keys }): void => {
    if (this.input.getCurrentContext() !== INPUT_CONTEXT.Dungeon) {
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

  private handleGamepadButtonPress = (event: { ctx: string; button: number }): void => {
    if (event.ctx !== INPUT_CONTEXT.Dungeon) {
      return;
    }
    switch (event.button) {
      case 12:
        this.player.moveForward();
        break;

      case 13:
        this.player.moveBackward();
        break;

      case 14:
        this.player.turnLeft();
        break;

      case 15:
        this.player.turnRight();
        break;

      case 0:
        this.player.interact();
        break;
    }
  };

  setPlayer(player: DungeonPlayer): void {
    this.dispose();
    this.player = player;
    this.initialize();
  }
}
