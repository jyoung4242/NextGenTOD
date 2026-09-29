import { ScreenElement } from "excalibur";
import { DungeonViewportGraphic } from "./DungeonViewportGraphic";
import { DungeonDefinition, DungeonCamera, DungeonState } from "../GameTypes";

export interface DungeonViewportOptions {
  dungeon: DungeonDefinition;
  getState: () => DungeonState; // <--- Dynamic getter instead of static state
  camera: DungeonCamera;
  width: number;
  height: number;
}

export class DungeonViewport extends ScreenElement {
  public readonly viewportGraphic: DungeonViewportGraphic;

  public constructor(options: DungeonViewportOptions) {
    super({
      width: options.width,
      height: options.height,
      z: 1,
    });

    this.viewportGraphic = new DungeonViewportGraphic({
      dungeon: options.dungeon,
      getState: options.getState,
      camera: options.camera,
      width: options.width,
      height: options.height,
    });

    this.graphics.use(this.viewportGraphic);
  }
}
