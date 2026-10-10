// UI/DungeonViewportGraphic.ts
import { ExcaliburGraphicsContext, Graphic, Vector } from "excalibur";
import { DungeonDefinition, DungeonCamera, DungeonState } from "../GameTypes";
import { DungeonRaycaster } from "./DungeonRaycaster";
import { ContentRegistry } from "../Content/ContentRegistry";

export interface DungeonViewportGraphicOptions {
  dungeon: DungeonDefinition;
  getState: () => DungeonState;
  camera: DungeonCamera;
  width: number;
  height: number;
  textures: Map<string, HTMLImageElement>;
  content?: ContentRegistry;
}

export class DungeonViewportGraphic extends Graphic {
  private readonly dungeon: DungeonDefinition;
  private readonly getState: () => DungeonState;
  private readonly camera: DungeonCamera;
  private readonly raycaster: DungeonRaycaster;
  private readonly textures: Map<string, HTMLImageElement>;
  private readonly content?: ContentRegistry;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public constructor(options: DungeonViewportGraphicOptions) {
    super({ width: options.width, height: options.height });
    this.dungeon = options.dungeon;
    this.getState = options.getState;
    this.camera = options.camera;
    this.textures = options.textures;
    debugger;
    this.content = options.content;
    this.raycaster = new DungeonRaycaster();

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d")!;
  }

  public clone(): Graphic {
    return new DungeonViewportGraphic({
      dungeon: this.dungeon,
      getState: this.getState,
      camera: this.camera,
      width: this.width,
      height: this.height,
      textures: this.textures,
      content: this.content,
    });
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    this.redrawViewport();
    this.canvas.setAttribute("forceUpload", "true");
    ex.drawImage(this.canvas, x, y, this.width, this.height);
  }

  private redrawViewport(): void {
    const { ctx, width, height } = this;
    const currentState = this.getState();
    const projectionPlane = width / 2 / Math.tan(this.camera.fov / 2);

    ctx.clearRect(0, 0, width, height);

    // -------------------------------------------------------------
    // 1. Ceiling & Floor (Fill Patterns)
    // -------------------------------------------------------------
    const floorImg = this.textures.get(this.dungeon.defaultFloorTexture ?? "dirt");
    const ceilingImg = this.textures.get(this.dungeon.defaultCeilingTexture ?? "ceiling");

    if (floorImg && ceilingImg) {
      const ceilingPattern = ctx.createPattern(ceilingImg, "repeat");
      if (ceilingPattern) {
        ctx.fillStyle = ceilingPattern;
        ctx.fillRect(0, 0, width, height / 2);
      }

      const floorPattern = ctx.createPattern(floorImg, "repeat");
      if (floorPattern) {
        ctx.fillStyle = floorPattern;
        ctx.fillRect(0, height / 2, width, height / 2);
      }
    } else {
      ctx.fillStyle = "#202020";
      ctx.fillRect(0, 0, width, height / 2);
      ctx.fillStyle = "#101010";
      ctx.fillRect(0, height / 2, width, height / 2);
    }

    // Depth buffer for depth testing billboards against wall depth
    const zBuffer = new Float32Array(width);

    // -------------------------------------------------------------
    // 2. Wall Raycast Loop with Texture Slicing
    // -------------------------------------------------------------
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

      zBuffer[screenX] = correctedDistance;

      const wallHeight = projectionPlane / correctedDistance;
      const wallTop = (height - wallHeight) / 2;

      let textureKey = hit.wall.textureKey;

      if (hit.wall.type === "door") {
        textureKey = "door"; // Uses map.set("door", Resources.door.image) from resources.ts
      } else if (!textureKey) {
        textureKey = this.dungeon.defaultWallTexture ?? "stone";
      }

      const wallTexture = this.textures.get(textureKey);

      if (wallTexture) {
        let texX = Math.floor(hit.wallOffset * wallTexture.width);

        const rayDirX = Math.cos(rayAngle);
        const rayDirY = Math.sin(rayAngle);
        if (
          (hit.side === "west" && rayDirX > 0) ||
          (hit.side === "east" && rayDirX < 0) ||
          (hit.side === "north" && rayDirY < 0) ||
          (hit.side === "south" && rayDirY > 0)
        ) {
          texX = wallTexture.width - texX - 1;
        }

        ctx.drawImage(
          wallTexture,
          texX,
          0,
          1,
          wallTexture.height, // Source 1px stripe
          screenX,
          wallTop,
          1,
          wallHeight, // Destination column
        );
      } else {
        ctx.fillStyle = hit.side === "north" || hit.side === "south" ? "#888888" : "#666666";
        ctx.fillRect(screenX, wallTop, 1, wallHeight);
      }
    }

    // -------------------------------------------------------------
    // 3. Item & Key Billboards (Depth-tested against zBuffer)
    // -------------------------------------------------------------
    const uncollectedItems = (this.dungeon.items ?? []).filter(item => {
      const coordKey = `${item.position.x},${item.position.y}`;
      return !currentState.containers[coordKey]?.opened;
    });

    for (const item of uncollectedItems) {
      const textureKey = this.resolveItemTextureKey(item.id, item.keyId);

      this.renderBillboard(
        ctx,
        item.position.x + 0.5,
        item.position.y + 0.5,
        0.35, // Item scale on floor
        textureKey,
        zBuffer,
        projectionPlane,
      );
    }

    const activeEnemies = Object.values(currentState.enemies).filter(enemy => enemy.alive && enemy.state !== "dead");
    console.log(
      "Active enemies:",
      activeEnemies.map(e => e.definitionId),
    );
    for (const enemy of activeEnemies) {
      // Look up static definition in ContentRegistry using enemy.definitionId
      debugger;
      const enemyDef = this.content?.getEnemy(enemy.definitionId);

      // Resolve texture key (fallback to textureKey -> avatarKey -> "goblin")
      console.log("Rendering enemy:", enemy.definitionId, enemyDef);
      const textureKey = enemyDef?.textureKey ?? enemyDef?.avatarKey ?? "goblin";

      // Resolve rendering dimensions or fall back to defaults
      const scale = enemyDef?.scale ?? 0.6;
      const yOffset = enemyDef?.yOffset ?? 0.2;

      this.renderBillboard(ctx, enemy.position.x + 0.5, enemy.position.y + 0.5, scale, textureKey, zBuffer, projectionPlane, yOffset);
    }
  }

  private resolveItemTextureKey(itemId: string, keyId?: string): string {
    // 1. If key placement, default to key sprite
    if (keyId) return "key";

    // 2. Look up static ItemDefinition in ContentRegistry
    if (this.content) {
      const itemDef = this.content.getItem(itemId);
      if (itemDef?.textureKey) {
        return itemDef.textureKey;
      }
    }

    // 3. Fallback default
    return "potion";
  }

  private renderBillboard(
    ctx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    scale: number,
    textureKey: string,
    zBuffer: Float32Array,
    projectionPlane: number,
    yOffset: number = 0, // Offset multiplier relative to sprite height (+ lowers, - raises)
  ): void {
    const { width, height } = this;

    const dx = worldX - this.camera.x;
    const dy = worldY - this.camera.y;

    const rawDistance = Math.hypot(dx, dy);
    if (rawDistance < 0.2) return;

    let spriteAngle = Math.atan2(dy, dx) - this.camera.angle;
    while (spriteAngle < -Math.PI) spriteAngle += Math.PI * 2;
    while (spriteAngle > Math.PI) spriteAngle -= Math.PI * 2;

    if (Math.abs(spriteAngle) >= this.camera.fov / 2) return;

    const correctedDistance = rawDistance * Math.cos(spriteAngle);
    if (correctedDistance <= 0) return;

    const centerScreenX = Math.floor(width / 2 + Math.tan(spriteAngle) * projectionPlane);
    const spriteSize = (projectionPlane / correctedDistance) * scale;

    // BASE CALCULATION:
    // (height - spriteSize) / 2 centers the sprite vertically.
    // Adding (spriteSize * yOffset) allows adjusting the vertical anchor line.
    const baseTop = (height - spriteSize) / 2;
    const spriteTop = baseTop + spriteSize * yOffset;

    const startX = Math.floor(centerScreenX - spriteSize / 2);
    const endX = Math.floor(centerScreenX + spriteSize / 2);

    const img = this.textures.get(textureKey);

    if (img) {
      for (let col = startX; col <= endX; col++) {
        if (col >= 0 && col < width && correctedDistance < zBuffer[col]) {
          const texX = Math.floor(((col - startX) / spriteSize) * img.width);
          ctx.drawImage(img, texX, 0, 1, img.height, col, spriteTop, 1, spriteSize);
        }
      }
    }
  }
}
