import { Color, ExcaliburGraphicsContext, Graphic, Vector } from "excalibur";
import { DungeonDefinition, DungeonCamera, DungeonState } from "../GameTypes";
import { DungeonRaycaster } from "./DungeonRaycaster";
import { DrawBillboardParams } from "./BillboardRenderer";
import { Signal } from "../Lib/Signals";

export interface DungeonViewportGraphicOptions {
  dungeon: DungeonDefinition;
  getState: () => DungeonState;
  camera: DungeonCamera;
  width: number;
  height: number;
}

export class DungeonViewportGraphic extends Graphic {
  private options: DungeonViewportGraphicOptions;
  private readonly dungeon: DungeonDefinition;
  private readonly getState: () => DungeonState;
  private readonly camera: DungeonCamera;
  private readonly raycaster: DungeonRaycaster;

  // Offscreen Canvas & Dirty Flag State
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDirty: boolean = true;
  dungeonDirtyFlag: Signal = new Signal("dungeon:draw:dirty");

  public constructor(options: DungeonViewportGraphicOptions) {
    super({
      width: options.width,
      height: options.height,
    });
    this.options = options;
    this.dungeon = options.dungeon;
    this.getState = options.getState;
    this.camera = options.camera;
    this.raycaster = new DungeonRaycaster();

    // 1. Create offscreen canvas owned by this graphic
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to acquire 2D context for DungeonViewportGraphic canvas");
    }
    this.ctx = context;

    this.dungeonDirtyFlag.listen(() => {
      this.flagDirty();
    });
  }

  /**
   * Call when player moves, camera turns, or dungeon state changes.
   */
  public flagDirty(): void {
    this.isDirty = true;
  }

  public clone(): DungeonViewportGraphic {
    return new DungeonViewportGraphic(this.options);
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    // 2. Redraw offscreen buffer only when dirty
    if (this.isDirty) {
      this.redrawViewport();
      this.isDirty = false;
    }

    // 3. Fast-path: Draw cached offscreen canvas to Excalibur pipeline
    this.canvas.setAttribute("forceUpload", "true");
    ex.drawImage(this.canvas, x, y, this.width, this.height);
  }

  private redrawViewport(): void {
    const { ctx } = this;
    const width = this.width;
    const height = this.height;
    const currentState = this.getState();

    // Clear previous offscreen frame
    ctx.clearRect(0, 0, width, height);

    // 1. Ceiling & Floor
    ctx.fillStyle = "#202020";
    ctx.fillRect(0, 0, width, height / 2);

    ctx.fillStyle = "#101010";
    ctx.fillRect(0, height / 2, width, height / 2);

    const projectionPlane = width / 2 / Math.tan(this.camera.fov / 2);
    const zBuffer = new Float32Array(width);

    // 2. Wall & Door Raycast Loop
    for (let screenX = 0; screenX < width; screenX++) {
      const normalizedX = (screenX + 0.5) / width;
      const rayAngle = this.camera.angle - this.camera.fov / 2 + normalizedX * this.camera.fov;

      console.log("redraw dungeon", normalizedX, rayAngle, this.dungeon.grid, currentState);
      const hit = this.raycaster.cast(this.dungeon.grid, currentState, this.camera, rayAngle);

      if (!hit) {
        zBuffer[screenX] = Infinity;
        continue;
      }

      const correctedDistance = hit.distance * Math.cos(rayAngle - this.camera.angle);
      if (correctedDistance <= 0) {
        zBuffer[screenX] = Infinity;
        continue;
      }

      zBuffer[screenX] = correctedDistance;

      const wallHeight = projectionPlane / correctedDistance;
      const wallTop = (height - wallHeight) / 2;

      let color = "#000000";

      if (hit.wall.type === "door") {
        const doorState = currentState.doors[hit.wall.doorId];
        if (doorState?.locked) {
          color = "#a02020";
        } else if (!doorState?.open) {
          color = "#8b5a2b";
        }
      } else {
        color = hit.side === "north" || hit.side === "south" ? "#888888" : "#666666";
      }

      ctx.fillStyle = color;

      ctx.fillRect(screenX, wallTop, 1, wallHeight);
    }

    // 3. Render Uncollected Ground Items
    const uncollectedItems = (this.dungeon.items ?? []).filter(item => {
      const coordKey = `${item.position.x},${item.position.y}`;
      return !currentState.containers[coordKey]?.opened;
    });

    for (const item of uncollectedItems) {
      const itemX = item.position.x + 0.5;
      const itemY = item.position.y + 0.5;

      const dx = itemX - this.camera.x;
      const dy = itemY - this.camera.y;

      const rawDistance = Math.hypot(dx, dy);
      if (rawDistance < 0.2) continue;

      let itemAngle = Math.atan2(dy, dx) - this.camera.angle;
      while (itemAngle < -Math.PI) itemAngle += Math.PI * 2;
      while (itemAngle > Math.PI) itemAngle -= Math.PI * 2;

      if (Math.abs(itemAngle) < this.camera.fov / 2) {
        const correctedItemDistance = rawDistance * Math.cos(itemAngle);
        const centerScreenX = Math.floor(width / 2 + Math.tan(itemAngle) * projectionPlane);

        const itemSize = (projectionPlane / correctedItemDistance) * 0.25;
        const itemTop = (height - itemSize) / 2 + itemSize / 2;
        const startX = Math.floor(centerScreenX - itemSize / 2);
        const endX = Math.floor(centerScreenX + itemSize / 2);

        ctx.fillStyle = this.getItemColorHex(item.id, item.keyId);

        for (let col = startX; col <= endX; col++) {
          if (col >= 0 && col < width && correctedItemDistance < zBuffer[col]) {
            ctx.fillRect(col, itemTop, 1, itemSize);
          }
        }
      }
    }

    // 4. Render Enemies
    const activeEnemies = Object.values(currentState.enemies).filter(enemy => enemy.alive || enemy.state !== "dead");

    for (const enemy of activeEnemies) {
      const enemyX = enemy.position.x + 0.5;
      const enemyY = enemy.position.y + 0.5;

      const dx = enemyX - this.camera.x;
      const dy = enemyY - this.camera.y;

      const rawDistance = Math.hypot(dx, dy);
      if (rawDistance < 0.2) continue;

      let enemyAngle = Math.atan2(dy, dx) - this.camera.angle;
      while (enemyAngle < -Math.PI) enemyAngle += Math.PI * 2;
      while (enemyAngle > Math.PI) enemyAngle -= Math.PI * 2;

      if (Math.abs(enemyAngle) < this.camera.fov / 2) {
        const correctedDistance = rawDistance * Math.cos(enemyAngle);
        const centerScreenX = Math.floor(width / 2 + Math.tan(enemyAngle) * projectionPlane);

        const enemySize = (projectionPlane / correctedDistance) * 0.6;
        const enemyTop = (height - enemySize) / 2;
        const startX = Math.floor(centerScreenX - enemySize / 2);
        const endX = Math.floor(centerScreenX + enemySize / 2);

        ctx.fillStyle = enemy.state === "alert" ? "#ef4444" : "#a855f7";

        for (let col = startX; col <= endX; col++) {
          if (col >= 0 && col < width && correctedDistance < zBuffer[col]) {
            ctx.fillRect(col, enemyTop, 1, enemySize);
          }
        }
      }
    }
  }

  private getItemColorHex(itemId?: string, keyId?: string): string {
    if (keyId) return "#ffd700";
    if (itemId?.startsWith("potion_")) return "#e63946";
    if (itemId?.startsWith("scroll_")) return "#a855f7";
    return "#ffffff";
  }

  public renderBillboards(
    ctx: CanvasRenderingContext2D,
    billboards: DrawBillboardParams[],
    zBuffer: number[],
    spritesheetMap: Map<string, HTMLImageElement>,
  ) {
    for (const sprite of billboards) {
      const img = spritesheetMap.get(sprite.textureUrl);
      if (!img) continue;

      for (let stripe = sprite.drawStartX; stripe < sprite.drawStartX + sprite.drawWidth; stripe++) {
        if (stripe < 0 || stripe >= ctx.canvas.width) continue;

        if (sprite.distance < zBuffer[stripe]) {
          const texX = Math.floor(((stripe - sprite.drawStartX) / sprite.drawWidth) * img.width);

          ctx.drawImage(img, texX, 0, 1, img.height, stripe, sprite.drawStartY, 1, sprite.drawHeight);
        }
      }
    }
  }
}
