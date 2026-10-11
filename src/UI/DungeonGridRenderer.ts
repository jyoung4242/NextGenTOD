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
    const tileSize = options.tileSize ?? 48;
    const state = options.store.get();
    const encounter = state.game.encounter;

    let gridWidth = 960;
    let gridHeight = 540;

    if (encounter) {
      const { minX, maxX, minY, maxY } = encounter.arenaBounds;
      gridWidth = (maxX - minX + 1) * tileSize;
      gridHeight = (maxY - minY + 1) * tileSize;
    }

    super({
      pos: options.position ?? vec(0, 0),
      anchor: vec(0, 0),
      z: 0,
      width: gridWidth, // Crucial: Set exact bounds width to prevent culling on zoom
      height: gridHeight, // Crucial: Set exact bounds height to prevent culling on zoom
    });

    this.gridGraphic = new DungeonGridGraphic({
      store: options.store,
      contentRegistry: options.contentRegistry,
      tileSize,
      width: gridWidth,
      height: gridHeight,
    });

    this.graphics.use(this.gridGraphic);
  }

  public override onPreUpdate(): void {
    this.gridGraphic.flagDirty();
  }
}
