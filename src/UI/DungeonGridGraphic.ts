// Graphics/DungeonGridGraphic.ts
import { Graphic, ExcaliburGraphicsContext } from "excalibur";
import { StateStore } from "../GameState";
import { GameState } from "../GameTypes";

export class DungeonGridGraphic extends Graphic {
  private readonly store: StateStore<GameState>;
  private readonly tileSize: number;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDirty: boolean = true;

  constructor(options: { store: StateStore<GameState>; tileSize?: number }) {
    super();
    this.store = options.store;
    this.tileSize = options.tileSize ?? 48; // Scaled up slightly for better visibility

    this.canvas = document.createElement("canvas");
    this.canvas.width = 960;
    this.canvas.height = 540;

    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Failed to get 2D context");
    this.ctx = context;
  }

  clone(): Graphic {
    return new DungeonGridGraphic({
      store: this.store,
      tileSize: this.tileSize,
    });
  }

  public flagDirty(): void {
    this.isDirty = true;
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    if (this.isDirty) {
      this.redrawGrid();
      this.isDirty = false;
    }
    this.canvas.setAttribute("forceUpload", "true");
    ex.drawImage(this.canvas, x, y, this.canvas.width, this.canvas.height);
  }

  private redrawGrid(): void {
    const state = this.store.get();
    const encounter = state.game.encounter;
    if (!encounter) return;

    const { minX, maxX, minY, maxY } = encounter.arenaBounds;
    const { ctx, tileSize } = this;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculate centering offsets
    const gridWidth = (maxX - minX + 1) * tileSize;
    const gridHeight = (maxY - minY + 1) * tileSize;
    const offsetX = (this.canvas.width - gridWidth) / 2;
    const offsetY = (this.canvas.height - gridHeight) / 2;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const drawX = offsetX + (x - minX) * tileSize;
        const drawY = offsetY + (y - minY) * tileSize;

        // Draw Floor Tile
        ctx.fillStyle = "#22252a";
        ctx.fillRect(drawX, drawY, tileSize - 1, tileSize - 1);

        // Draw Grid Lines
        ctx.strokeStyle = "#333740";
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, drawY, tileSize, tileSize);
      }
    }
  }
}
