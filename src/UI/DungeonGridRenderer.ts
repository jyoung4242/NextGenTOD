// UI/DungeonGridRenderer.ts
import { Actor, Vector, vec } from "excalibur";
import { StateStore } from "../GameState";
import { GameState } from "../GameTypes";
import { DungeonGridGraphic } from "./DungeonGridGraphic";
import { ContentRegistry } from "../Content/ContentRegistry";

export interface DungeonGridRendererOptions {
  store: StateStore<GameState>;
  contentRegistry: ContentRegistry;
  position?: Vector;
  tileSize?: number;
}

export class DungeonGridRenderer extends Actor {
  private gridGraphic: DungeonGridGraphic;

  constructor(options: DungeonGridRendererOptions) {
    super({
      pos: options.position ?? vec(0, 0),
      anchor: vec(0, 0),
      z: 0,
    });

    this.gridGraphic = new DungeonGridGraphic({
      store: options.store,
      contentRegistry: options.contentRegistry,
      tileSize: options.tileSize ?? 48,
    });

    this.graphics.use(this.gridGraphic);
  }

  public override onPreUpdate(): void {
    this.gridGraphic.flagDirty();
  }
}
