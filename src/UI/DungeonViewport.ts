// UI/DungeonViewport.ts
import { ScreenElement } from "excalibur";
import { DungeonViewportGraphic } from "./DungeonViewportGraphic";
import { DungeonDefinition, DungeonCamera, DungeonState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";

export interface DungeonViewportOptions {
  dungeon: DungeonDefinition;
  getState: () => DungeonState;
  camera: DungeonCamera;
  width: number;
  height: number;
  textures: Map<string, HTMLImageElement>; // Add textures map here
  content?: ContentRegistry; // Optional content registry
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
      textures: options.textures, // Forward to DungeonViewportGraphic
      content: options.content, // Forward to DungeonViewportGraphic
    });

    this.graphics.use(this.viewportGraphic);
  }
}
