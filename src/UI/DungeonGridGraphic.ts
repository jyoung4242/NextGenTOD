// Graphics/DungeonGridGraphic.ts
import { Graphic, ExcaliburGraphicsContext } from "excalibur";
import { StateStore } from "../GameState";
import { GameState, getDungeonCell } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";
import { getLoadedTextures } from "../resources";

export class DungeonGridGraphic extends Graphic {
  private readonly store: StateStore<GameState>;
  private readonly contentRegistry: ContentRegistry;
  private readonly tileSize: number;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDirty: boolean = true;
  private textures: Map<string, HTMLImageElement>;

  constructor(options: {
    store: StateStore<GameState>;
    contentRegistry: ContentRegistry;
    tileSize?: number;
    width: number;
    height: number;
  }) {
    super({ width: options.width, height: options.height });
    this.store = options.store;
    this.contentRegistry = options.contentRegistry;
    this.tileSize = options.tileSize ?? 48;
    this.textures = getLoadedTextures();

    this.canvas = document.createElement("canvas");
    this.canvas.width = options.width;
    this.canvas.height = options.height;

    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Failed to get 2D context");
    this.ctx = context;
  }

  public clone(): DungeonGridGraphic {
    return new DungeonGridGraphic({
      store: this.store,
      contentRegistry: this.contentRegistry,
      tileSize: this.tileSize,
      width: this.width,
      height: this.height,
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
    ex.drawImage(this.canvas, x, y, this.width, this.height);
  }

  private redrawGrid(): void {
    const state = this.store.get();
    const encounter = state.game.encounter;
    if (!encounter) return;

    const activeDungeonId = state.dungeon?.current ?? "test-dungeon";
    const dungeonDef = this.contentRegistry.getDungeon(activeDungeonId);

    if (!dungeonDef) return;

    const grid = dungeonDef.grid;
    const { minX, maxX, minY, maxY } = encounter.arenaBounds;
    const { ctx, tileSize } = this;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const drawX = (x - minX) * tileSize;
        const drawY = (y - minY) * tileSize;

        const cell = getDungeonCell(grid, x, y);

        if (cell && cell.floor === "floor") {
          const floorTextureKey = dungeonDef.defaultFloorTexture ?? "dirt";
          const floorImg = this.textures.get(floorTextureKey);

          if (floorImg && floorImg.complete && floorImg.naturalWidth !== 0) {
            ctx.drawImage(floorImg, drawX, drawY, tileSize, tileSize);
          } else {
            ctx.fillStyle = "#22252a";
            ctx.fillRect(drawX, drawY, tileSize, tileSize);
          }

          ctx.strokeStyle = "#333740";
          ctx.lineWidth = 1;
          ctx.strokeRect(drawX, drawY, tileSize, tileSize);

          // Walls
          ctx.strokeStyle = "#4a5568";
          ctx.lineWidth = 2;
          if (cell.north?.type === "wall") {
            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            ctx.lineTo(drawX + tileSize, drawY);
            ctx.stroke();
          }
          if (cell.south?.type === "wall") {
            ctx.beginPath();
            ctx.moveTo(drawX, drawY + tileSize);
            ctx.lineTo(drawX + tileSize, drawY + tileSize);
            ctx.stroke();
          }
          if (cell.west?.type === "wall") {
            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            ctx.lineTo(drawX, drawY + tileSize);
            ctx.stroke();
          }
          if (cell.east?.type === "wall") {
            ctx.beginPath();
            ctx.moveTo(drawX + tileSize, drawY);
            ctx.lineTo(drawX + tileSize, drawY + tileSize);
            ctx.stroke();
          }
        } else {
          const wallTextureKey = dungeonDef.defaultWallTexture ?? "stone";
          const wallImg = this.textures.get(wallTextureKey);

          if (wallImg && wallImg.complete && wallImg.naturalWidth !== 0) {
            ctx.drawImage(wallImg, drawX, drawY, tileSize, tileSize);
          } else {
            ctx.fillStyle = "#0d0e11";
            ctx.fillRect(drawX, drawY, tileSize, tileSize);
          }

          ctx.strokeStyle = "#1a1d24";
          ctx.lineWidth = 1;
          ctx.strokeRect(drawX, drawY, tileSize, tileSize);
        }
      }
    }
  }
}
