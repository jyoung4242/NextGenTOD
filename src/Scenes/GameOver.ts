// Scenes/GameOverScene.ts
import { Scene, Label, Color, Font, Vector, Keys, Engine } from "excalibur";
import { StateStore, createInitialGameState } from "../GameState";
import { GameState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";
import { createDungeonState } from "../Lib/Managers/DungeonManager";

export class GameOverScene extends Scene {
  private titleLabel!: Label;
  private promptLabel!: Label;

  constructor(
    private readonly store: StateStore<GameState>,
    private readonly content: ContentRegistry,
  ) {
    super();
  }

  public override onInitialize(engine: Engine): void {
    this.titleLabel = new Label({
      text: "GAME OVER",
      pos: new Vector(engine.drawWidth / 2 - 140, engine.drawHeight / 3),
      font: new Font({
        size: 48,
        color: Color.Red,
        bold: true,
      }),
    });
    this.titleLabel.graphics.use(this.titleLabel.font);

    this.promptLabel = new Label({
      text: "Press [ R ] to Restart",
      pos: new Vector(engine.drawWidth / 2 - 100, engine.drawHeight / 2 + 40),
      font: new Font({
        size: 20,
        color: Color.White,
      }),
    });

    this.add(this.titleLabel);
    this.add(this.promptLabel);

    engine.input.keyboard.on("press", evt => {
      if (this.engine.currentScene === this && evt.key === Keys.R) {
        this.resetGame();
      }
    });
  }

  private resetGame(): void {
    this.store.reset();
  }
}
