import { Graphic, GraphicOptions, ExcaliburGraphicsContext, Vector, ScreenElement, vec } from "excalibur";
import { DungeonDefinition, DungeonCamera, Direction, DungeonState } from "../GameTypes";
import { Dungeon } from "../Lib/Managers/DungeonManager";

export interface MinimapGraphicOptions extends GraphicOptions {
  dungeon: DungeonDefinition;
  dungeonManager: Dungeon;
  getState: () => DungeonState;
  camera: DungeonCamera;
  tileSize?: number;
}

export interface MinimapOptions {
  dungeon: DungeonDefinition;
  dungeonManager: Dungeon;
  getState: () => DungeonState;
  camera: DungeonCamera;
  position?: Vector;
  tileSize?: number;
}

export class Minimap extends ScreenElement {
  private minimapGraphic: MinimapGraphic;

  constructor(options: MinimapOptions) {
    const tileSize = options.tileSize ?? 12;
    const width = options.dungeon.grid.width * tileSize;
    const height = options.dungeon.grid.height * tileSize;
    super({
      pos: options.position ?? vec(16, 16),
      width,
      height,
      anchor: vec(0, 0),
      z: 100,
      opacity: 0.6,
    });

    this.minimapGraphic = new MinimapGraphic({
      dungeon: options.dungeon,
      dungeonManager: options.dungeonManager,
      getState: options.getState,
      camera: options.camera,
      tileSize: options.tileSize ?? 12,
    });

    this.graphics.use(this.minimapGraphic);
  }

  public override onPreUpdate(): void {
    this.minimapGraphic.flagDirty();
  }
}

export class MinimapGraphic extends Graphic {
  private readonly dungeon: DungeonDefinition;
  private readonly dungeonManager: Dungeon;
  private readonly getState: () => DungeonState;
  private readonly camera: DungeonCamera;
  private readonly tileSize: number;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDirty: boolean = true;

  constructor(public options: MinimapGraphicOptions) {
    super(options);
    this.dungeon = options.dungeon;
    this.dungeonManager = options.dungeonManager;
    this.getState = options.getState;
    this.camera = options.camera;
    this.tileSize = options.tileSize ?? 12;

    this.width = this.dungeon.grid.width * this.tileSize;
    this.height = this.dungeon.grid.height * this.tileSize;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to acquire 2D context for MinimapGraphic canvas");
    }
    this.ctx = context;
  }

  public flagDirty(): void {
    this.isDirty = true;
  }

  public clone(): MinimapGraphic {
    return new MinimapGraphic(this.options);
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    if (this.isDirty) {
      this.redrawMap();
      this.isDirty = false;
    }

    this.canvas.setAttribute("forceUpload", "true");
    ex.drawImage(this.canvas, x, y, this.width, this.height);
  }

  private redrawMap(): void {
    const { ctx, tileSize: ts, width, height } = this;
    const grid = this.dungeon.grid;
    const currentState = this.getState();

    // 1. Clear background
    ctx.fillStyle = "rgba(10, 10, 15, 0.85)";
    ctx.fillRect(0, 0, width, height);

    // 2. Render cells & doors
    for (const cell of grid.cells) {
      const cx = cell.x * ts;
      const cy = cell.y * ts;

      if (cell.floor === "floor") {
        ctx.fillStyle = "#2a2a35";
        ctx.fillRect(cx, cy, ts, ts);
      }

      const directions: Direction[] = ["north", "east", "south", "west"];
      for (const dir of directions) {
        const wall = cell[dir];
        if (wall.type === "wall") {
          ctx.strokeStyle = "#8888aa";
          ctx.lineWidth = 2;
          this.drawWallLine(cx, cy, ts, dir);
        } else if (wall.type === "door") {
          const doorState = currentState.doors[wall.doorId];

          if (doorState?.locked) {
            ctx.strokeStyle = "#cc3333";
          } else if (doorState?.open) {
            ctx.strokeStyle = "#33cc66";
          } else {
            ctx.strokeStyle = "#ccaa33";
          }

          ctx.lineWidth = 3;
          this.drawWallLine(cx, cy, ts, dir);
        }
      }
    }

    // 3. Render Items / Ground Containers
    if (this.dungeon.items) {
      for (const item of this.dungeon.items) {
        const key = `${item.position.x},${item.position.y}`;
        const container = currentState.containers[key];

        if (!container?.opened) {
          if (item.itemId?.includes("potion") || item.itemId === "potion_health_minor") {
            ctx.fillStyle = "#e63946"; // Crimson Red for Potions
          } else {
            ctx.fillStyle = "#ffd700"; // Gold for Keys / Defaults
          }

          ctx.beginPath();
          ctx.arc(item.position.x * ts + ts / 2, item.position.y * ts + ts / 2, ts * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4. Render player indicator
    const px = this.camera.x * ts;
    const py = this.camera.y * ts;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this.camera.angle);

    ctx.fillStyle = "rgba(255, 200, 0, 0.25)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, ts * 1.5, -Math.PI / 6, Math.PI / 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.moveTo(ts * 0.4, 0);
    ctx.lineTo(-ts * 0.3, -ts * 0.3);
    ctx.lineTo(-ts * 0.15, 0);
    ctx.lineTo(-ts * 0.3, ts * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawWallLine(x: number, y: number, ts: number, dir: Direction): void {
    const ctx = this.ctx;
    ctx.beginPath();
    switch (dir) {
      case "north":
        ctx.moveTo(x, y);
        ctx.lineTo(x + ts, y);
        break;
      case "east":
        ctx.moveTo(x + ts, y);
        ctx.lineTo(x + ts, y + ts);
        break;
      case "south":
        ctx.moveTo(x, y + ts);
        ctx.lineTo(x + ts, y + ts);
        break;
      case "west":
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + ts);
        break;
    }
    ctx.stroke();
  }
}
