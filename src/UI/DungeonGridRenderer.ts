// UI/DungeonGridRenderer.ts
import { ScreenElement, Vector, vec } from "excalibur";
import { StateStore } from "../GameState";
import { GameState } from "../GameTypes";
import { DungeonGridGraphic } from "./DungeonGridGraphic";

export interface DungeonGridRendererOptions {
  store: StateStore<GameState>;
  position?: Vector;
  tileSize?: number;
}

export class DungeonGridRenderer extends ScreenElement {
  private gridGraphic: DungeonGridGraphic;

  constructor(options: DungeonGridRendererOptions) {
    super({
      pos: options.position ?? vec(0, 0),
      anchor: vec(0, 0),
      z: 0,
    });

    this.gridGraphic = new DungeonGridGraphic({
      store: options.store,
      tileSize: options.tileSize ?? 32,
    });

    // Assign custom graphic to Excalibur ScreenElement
    this.graphics.use(this.gridGraphic);
  }

  public override onPreUpdate(): void {
    // Flag dirty if combat state turns or updates occur
    this.gridGraphic.flagDirty();
  }
}
