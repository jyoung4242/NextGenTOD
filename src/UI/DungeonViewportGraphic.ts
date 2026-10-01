import { Color, ExcaliburGraphicsContext, Graphic, Vector } from "excalibur";
import { DungeonDefinition, DungeonCamera, DungeonState } from "../GameTypes";
import { DungeonRaycaster } from "./DungeonRaycaster";
import { DrawBillboardParams } from "./BillboardRenderer";

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
  }

  public clone(): DungeonViewportGraphic {
    return new DungeonViewportGraphic(this.options);
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    const width = this.width;
    const height = this.height;
    const currentState = this.getState();

    // 1. Ceiling & Floor
    ex.drawRectangle(new Vector(0, 0), width, height / 2, Color.fromHex("#202020"));
    ex.drawRectangle(new Vector(0, height / 2), width, height / 2, Color.fromHex("#101010"));

    const projectionPlane = width / 2 / Math.tan(this.camera.fov / 2);

    // Depth buffer storing distance to nearest wall/door for every column
    const zBuffer = new Float32Array(width);

    // 2. Wall & Door Raycast Loop
    for (let screenX = 0; screenX < width; screenX++) {
      const normalizedX = (screenX + 0.5) / width;
      const rayAngle = this.camera.angle - this.camera.fov / 2 + normalizedX * this.camera.fov;

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

      // Record wall depth for item occlusion checks
      zBuffer[screenX] = correctedDistance;

      const wallHeight = projectionPlane / correctedDistance;
      const wallTop = (height - wallHeight) / 2;

      let color: Color = Color.Black;

      if (hit.wall.type === "door") {
        const doorState = currentState.doors[hit.wall.doorId];
        if (doorState?.locked) {
          color = Color.fromHex("#a02020");
        } else if (!doorState?.open) {
          color = Color.fromHex("#8b5a2b");
        }
      } else {
        color = hit.side === "north" || hit.side === "south" ? Color.fromHex("#888888") : Color.fromHex("#666666");
      }

      ex.drawRectangle(new Vector(screenX, wallTop), 1, wallHeight, color);
    }

    // 3. Render Uncollected Ground Items (Depth-tested against zBuffer)
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

      // Check FOV
      if (Math.abs(itemAngle) < this.camera.fov / 2) {
        // Perpendicular distance to prevent fisheye distortion
        const correctedItemDistance = rawDistance * Math.cos(itemAngle);
        const centerScreenX = Math.floor(width / 2 + Math.tan(itemAngle) * projectionPlane);

        const itemSize = (projectionPlane / correctedItemDistance) * 0.25;
        const itemTop = (height - itemSize) / 2 + itemSize / 2;
        const startX = Math.floor(centerScreenX - itemSize / 2);
        const endX = Math.floor(centerScreenX + itemSize / 2);

        // Determine color based on item type
        // let itemColor = Color.fromHex("#ffd700"); // Default Gold for keys/chests
        // if (item.itemId?.includes("potion") || item.itemId === "potion_health_minor") {
        //   itemColor = Color.fromHex("#e63946"); // Crimson Red for Potions
        // }
        const itemColor = this.getItemColor(item.id, item.keyId);

        // Column-by-column depth test against wall distance
        for (let col = startX; col <= endX; col++) {
          if (col >= 0 && col < width && correctedItemDistance < zBuffer[col]) {
            ex.drawRectangle(new Vector(col, itemTop), 1, itemSize, itemColor);
          }
        }
      }
    }

    // 4. Render Enemies (Depth-tested against zBuffer)
    const activeEnemies = Object.values(currentState.enemies).filter(enemy => enemy.alive || enemy.state !== "dead");

    for (const enemy of activeEnemies) {
      // Center position in tile (x + 0.5, y + 0.5)
      const enemyX = enemy.position.x + 0.5;
      const enemyY = enemy.position.y + 0.5;

      const dx = enemyX - this.camera.x;
      const dy = enemyY - this.camera.y;

      const rawDistance = Math.hypot(dx, dy);
      if (rawDistance < 0.2) continue; // Don't render if standing inside the enemy

      // Calculate relative angle from camera facing
      let enemyAngle = Math.atan2(dy, dx) - this.camera.angle;
      while (enemyAngle < -Math.PI) enemyAngle += Math.PI * 2;
      while (enemyAngle > Math.PI) enemyAngle -= Math.PI * 2;

      // Check if enemy is within FOV
      if (Math.abs(enemyAngle) < this.camera.fov / 2) {
        // Perpendicular distance to prevent fisheye effect
        const correctedDistance = rawDistance * Math.cos(enemyAngle);
        const centerScreenX = Math.floor(width / 2 + Math.tan(enemyAngle) * projectionPlane);

        // Make enemies slightly taller than floor items (e.g., 0.6x projection scale)
        const enemySize = (projectionPlane / correctedDistance) * 0.6;
        const enemyTop = (height - enemySize) / 2; // Center vertically on screen
        const startX = Math.floor(centerScreenX - enemySize / 2);
        const endX = Math.floor(centerScreenX + enemySize / 2);

        // Color based on enemy state (e.g. Red for aggressive/alert, Green/Purple for idle)
        const enemyColor = enemy.state === "alert" ? Color.fromHex("#ef4444") : Color.fromHex("#a855f7");

        // Column-by-column depth test against wall zBuffer
        for (let col = startX; col <= endX; col++) {
          if (col >= 0 && col < width && correctedDistance < zBuffer[col]) {
            ex.drawRectangle(new Vector(col, enemyTop), 1, enemySize, enemyColor);
          }
        }
      }
    }
  }
  private getItemColor(itemId?: string, keyId?: string): Color {
    if (keyId) return Color.fromHex("#ffd700"); // Gold for keys
    if (itemId?.startsWith("potion_")) return Color.fromHex("#e63946"); // Crimson Red for Potions
    if (itemId?.startsWith("scroll_")) return Color.fromHex("#a855f7"); // Purple for Scrolls

    return Color.fromHex("#ffffff"); // Default White
  }

  public renderBillboards(
    ctx: CanvasRenderingContext2D,
    billboards: DrawBillboardParams[],
    zBuffer: number[], // Wall depth per vertical screen column
    spritesheetMap: Map<string, HTMLImageElement>,
  ) {
    for (const sprite of billboards) {
      const img = spritesheetMap.get(sprite.textureUrl);
      if (!img) continue;

      // Draw sprite column by column to clip behind walls
      for (let stripe = sprite.drawStartX; stripe < sprite.drawStartX + sprite.drawWidth; stripe++) {
        if (stripe < 0 || stripe >= ctx.canvas.width) continue;

        // Depth test: Only draw if sprite column is closer than wall ray distance
        if (sprite.distance < zBuffer[stripe]) {
          const texX = Math.floor(((stripe - sprite.drawStartX) / sprite.drawWidth) * img.width);

          ctx.drawImage(
            img,
            texX,
            0,
            1,
            img.height, // Source crop column
            stripe,
            sprite.drawStartY,
            1,
            sprite.drawHeight, // Destination screen stripe
          );
        }
      }
    }
  }
}
