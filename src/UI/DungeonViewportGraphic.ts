// UI/DungeonViewportGraphic.ts
import { ExcaliburGraphicsContext, Graphic } from "excalibur";
import { DungeonDefinition, DungeonCamera, DungeonState, WallLayer, RaycastHit } from "../GameTypes";
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

  public flagDirty(): void {
    // Retained for API compatibility if called externally
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    this.redrawViewport();
    this.canvas.setAttribute("forceUpload", "true");
    ex.drawImage(this.canvas, x, y, this.width, this.height);
  }

  private redrawViewport(): void {
    const { ctx, width, height } = this;
    const currentState = this.getState();
    if (!currentState) return;
    const projectionPlane = width / 2 / Math.tan(this.camera.fov / 2);

    ctx.clearRect(0, 0, width, height);

    // Read lighting configuration from dungeon definition (with defaults)
    const lightingConfig = this.dungeon.lighting;
    const ambientLight = lightingConfig?.ambientLight ?? 0.15;
    const maxLightingDistance = lightingConfig?.maxLightingDistance ?? 12.0;
    const pointLights = lightingConfig?.lights ?? [];
    const activeLights = [...pointLights];
    const halfHeight = height / 2;

    // -------------------------------------------------------------
    // 1. Ceiling & Floor (Fill Patterns + Horizon Fog Overlays)
    // -------------------------------------------------------------
    const floorImg = this.textures.get(this.dungeon.defaultFloorTexture ?? "dirt");
    const ceilingImg = this.textures.get(this.dungeon.defaultCeilingTexture ?? "ceiling");

    if (ceilingImg) {
      const ceilingPattern = ctx.createPattern(ceilingImg, "repeat");
      if (ceilingPattern) {
        ctx.fillStyle = ceilingPattern;
        ctx.fillRect(0, 0, width, halfHeight);
      }
    } else {
      ctx.fillStyle = "#202020";
      ctx.fillRect(0, 0, width, halfHeight);
    }

    if (floorImg) {
      const floorPattern = ctx.createPattern(floorImg, "repeat");
      if (floorPattern) {
        ctx.fillStyle = floorPattern;
        ctx.fillRect(0, halfHeight, width, halfHeight);
      }
    } else {
      ctx.fillStyle = "#101010";
      ctx.fillRect(0, halfHeight, width, halfHeight);
    }

    if (ambientLight < 1.0) {
      const ceilingGradient = ctx.createLinearGradient(0, 0, 0, halfHeight);
      ceilingGradient.addColorStop(0.0, `rgba(0, 0, 0, 1.0)`);
      ceilingGradient.addColorStop(0.2, `rgba(0, 0, 0, ${1.0 - ambientLight})`);
      ceilingGradient.addColorStop(1.0, `rgba(0, 0, 0, ${1.0 - ambientLight})`);
      ctx.fillStyle = ceilingGradient;
      ctx.fillRect(0, 0, width, halfHeight);

      const floorGradient = ctx.createLinearGradient(0, halfHeight, 0, height);
      floorGradient.addColorStop(0.0, `rgba(0, 0, 0, ${1.0 - ambientLight})`);
      floorGradient.addColorStop(0.5, `rgba(0, 0, 0, ${1.0 - ambientLight})`);
      floorGradient.addColorStop(1.0, `rgba(0, 0, 0, 1.0)`);
      ctx.fillStyle = floorGradient;
      ctx.fillRect(0, halfHeight, width, height);
    }

    const zBuffer = new Float32Array(width);
    const currentTime = performance.now() * 0.001;

    // Collect all raycast hits per column
    const columnHits: { screenX: number; rayAngle: number; hits: RaycastHit[] }[] = [];

    for (let screenX = 0; screenX < width; screenX++) {
      const normalizedX = (screenX + 0.5) / width;
      const rayAngle = this.camera.angle - this.camera.fov / 2 + normalizedX * this.camera.fov;
      const hits = this.raycaster.cast(this.dungeon.grid, currentState, this.dungeon, this.camera, rayAngle);

      if (!hits || hits.length === 0) {
        zBuffer[screenX] = Infinity;
        continue;
      }

      // Z-Buffer tracks the closest solid wall/closed door
      const solidHit = hits.find(hit => {
        if (hit.wall.type === "door" && hit.wall.doorId) {
          const doorState = currentState.doors[hit.wall.doorId];
          return doorState?.open !== true;
        }
        return true;
      });

      if (solidHit) {
        const solidCorrectedDistance = solidHit.distance * Math.cos(rayAngle - this.camera.angle);
        zBuffer[screenX] = solidCorrectedDistance > 0 ? solidCorrectedDistance : Infinity;
      } else {
        zBuffer[screenX] = Infinity;
      }

      columnHits.push({ screenX, rayAngle, hits });
    }

    // -------------------------------------------------------------
    // 2. Prepare Billboards
    // -------------------------------------------------------------
    interface BillboardToRender {
      x: number;
      y: number;
      scale: number;
      textureKey: string;
      yOffset: number;
      distanceSq: number;
    }

    const billboards: BillboardToRender[] = [];

    const uncollectedItems = (this.dungeon.items ?? []).filter(item => {
      const coordKey = `${item.position.x},${item.position.y}`;
      return !currentState.containers?.[coordKey]?.opened;
    });

    for (const item of uncollectedItems) {
      const worldX = item.position.x + 0.5;
      const worldY = item.position.y + 0.5;
      const dx = worldX - this.camera.x;
      const dy = worldY - this.camera.y;
      billboards.push({
        x: worldX,
        y: worldY,
        scale: 0.35,
        textureKey: this.resolveItemTextureKey(item.id, item.keyId),
        yOffset: 0,
        distanceSq: dx * dx + dy * dy,
      });
    }

    const enemiesCache = currentState.enemies ?? {};
    const activeEnemies = Object.values(enemiesCache).filter(enemy => enemy && enemy.alive && enemy.state !== "dead");

    for (const enemy of activeEnemies) {
      const enemyDef = this.content?.getEnemy(enemy.definitionId);
      const textureKey = enemyDef?.textureKey ?? enemyDef?.avatarKey ?? "goblin";
      const scale = enemyDef?.scale ?? 0.6;
      const yOffset = enemyDef?.yOffset ?? 0.2;

      const worldX = enemy.position.x + 0.5;
      const worldY = enemy.position.y + 0.5;
      const dx = worldX - this.camera.x;
      const dy = worldY - this.camera.y;
      billboards.push({
        x: worldX,
        y: worldY,
        scale,
        textureKey,
        yOffset,
        distanceSq: dx * dx + dy * dy,
      });
    }

    // Sort billboards from furthest to nearest
    billboards.sort((a, b) => b.distanceSq - a.distanceSq);

    // -------------------------------------------------------------
    // 3. Render Walls, Open Doors, and Billboards Interleaved by Depth
    // -------------------------------------------------------------
    // To ensure open doors render AFTER billboards (or back-to-front accurately),
    // we split hits into background walls/closed doors (drawn first) and open doors (drawn last).

    for (const col of columnHits) {
      const { screenX, rayAngle, hits } = col;

      // Separate into background elements vs open door elements
      const backgroundHits: RaycastHit[] = [];
      const openDoorHits: RaycastHit[] = [];

      for (const hit of hits) {
        let isOpen = false;
        if (hit.wall.type === "door" && hit.wall.doorId) {
          const doorState = currentState.doors[hit.wall.doorId];
          isOpen = doorState?.open === true;
        }

        if (isOpen) {
          openDoorHits.push(hit);
        } else {
          backgroundHits.push(hit);
        }
      }

      // Pass 1: Draw background walls & closed doors (furthest to closest)
      backgroundHits.sort((a, b) => b.distance - a.distance);
      for (const hit of backgroundHits) {
        this.renderWallHit(
          ctx,
          hit,
          rayAngle,
          screenX,
          projectionPlane,
          ambientLight,
          maxLightingDistance,
          activeLights,
          currentTime,
          width,
          height,
        );
      }
    }

    // Pass 2: Draw Billboards (Enemies/Items standing in rooms/doorways)
    for (const billboard of billboards) {
      this.renderBillboard(
        ctx,
        billboard.x,
        billboard.y,
        billboard.scale,
        billboard.textureKey,
        zBuffer,
        projectionPlane,
        billboard.yOffset,
      );
    }

    // Pass 3: Draw Open Doors / Gates LAST so they correctly overlay over entities standing in/behind them
    for (const col of columnHits) {
      const { screenX, rayAngle, hits } = col;
      for (const hit of hits) {
        let isOpen = false;
        if (hit.wall.type === "door" && hit.wall.doorId) {
          const doorState = currentState.doors[hit.wall.doorId];
          isOpen = doorState?.open === true;
        }

        if (isOpen) {
          this.renderWallHit(
            ctx,
            hit,
            rayAngle,
            screenX,
            projectionPlane,
            ambientLight,
            maxLightingDistance,
            activeLights,
            currentTime,
            width,
            height,
          );
        }
      }
    }
  }

  private renderWallHit(
    ctx: CanvasRenderingContext2D,
    hit: RaycastHit,
    rayAngle: number,
    screenX: number,
    projectionPlane: number,
    ambientLight: number,
    maxLightingDistance: number,
    activeLights: any[],
    currentTime: number,
    width: number,
    height: number,
  ): void {
    const correctedDistance = hit.distance * Math.cos(rayAngle - this.camera.angle);
    if (correctedDistance <= 0) return;

    const wallHeight = projectionPlane / correctedDistance;
    const wallTop = (height - wallHeight) / 2;

    let activeLayers: WallLayer[] = [];

    if (hit.wall.type === "door") {
      const doorState = hit.wall.doorId ? this.getState().doors[hit.wall.doorId] : undefined;
      const isOpen = doorState?.open ?? false;
      const isLocked = doorState?.locked ?? false;

      if (isOpen) {
        const openTex = hit.wall.openTexture ?? "open_door_frame";
        activeLayers = [{ textureKey: openTex, alpha: 1.0, blendMode: "source-over" }];
      } else if (isLocked) {
        const closedTex = hit.wall.closedTexture ?? "door_locked";
        activeLayers = [{ textureKey: closedTex, alpha: 1.0, blendMode: "source-over" }];
      } else {
        if (hit.wall.layers && hit.wall.layers.length > 0) {
          activeLayers = hit.wall.layers;
        } else {
          const closedTex =
            hit.wall.closedTexture ?? (Array.isArray(hit.wall.textureKey) ? hit.wall.textureKey[0] : (hit.wall.textureKey ?? "door"));
          activeLayers = [{ textureKey: closedTex, alpha: 1.0, blendMode: "source-over" }];
        }
      }
    } else if (hit.wall.layers && hit.wall.layers.length > 0) {
      activeLayers = hit.wall.layers;
    } else if (hit.wall.textureKey) {
      if (Array.isArray(hit.wall.textureKey)) {
        activeLayers = hit.wall.textureKey.map((key, index) => ({
          textureKey: key,
          alpha: 1.0,
          blendMode: index > 0 ? "screen" : "source-over",
        }));
      } else {
        activeLayers = [{ textureKey: hit.wall.textureKey, alpha: 1.0, blendMode: "source-over" }];
      }
    } else {
      const defaultKey = this.dungeon.defaultWallTexture ?? "stone";
      activeLayers = [{ textureKey: defaultKey, alpha: 1.0, blendMode: "source-over" }];
    }

    let lightFactor = Math.max(0, 1.0 - correctedDistance / maxLightingDistance);
    lightFactor = ambientLight + (1.0 - ambientLight) * lightFactor;
    const now = performance.now() * 0.001;

    for (const light of activeLights) {
      const distToLight = Math.hypot(hit.x - light.x, hit.y - light.y);
      if (distToLight < light.radius) {
        const attenuation = 1.0 - distToLight / light.radius;
        let effectiveIntensity = light.intensity ?? 1.0;

        if (light.flicker?.enabled) {
          const speed = light.flicker.speed ?? 15.0;
          const amount = light.flicker.intensity ?? 0.1;
          const phase = ((light.x * 12.9898 + light.y * 78.233) % Math.PI) * 2;
          const time = now * speed + phase;
          const noise = Math.sin(time * 3.3) * 0.5 + Math.sin(time * 7.1) * 0.5;
          effectiveIntensity = Math.max(0, effectiveIntensity + noise * amount);
        }

        lightFactor += attenuation * effectiveIntensity;
      }
    }

    lightFactor = Math.min(1.5, Math.max(ambientLight, lightFactor));

    let renderedAny = false;
    for (const layer of activeLayers) {
      const wallTexture = this.textures.get(layer.textureKey);
      if (!wallTexture) continue;

      renderedAny = true;
      let texX = Math.floor(hit.wallOffset * wallTexture.width);

      if (layer.animation) {
        const { frameCount, fps, frameWidth } = layer.animation;
        const currentFrame = Math.floor(currentTime * fps) % frameCount;
        texX = currentFrame * frameWidth + Math.floor(hit.wallOffset * frameWidth);
      }

      const rayDirX = Math.cos(rayAngle);
      const rayDirY = Math.sin(rayAngle);
      if (
        (hit.side === "west" && rayDirX > 0) ||
        (hit.side === "east" && rayDirX < 0) ||
        (hit.side === "north" && rayDirY < 0) ||
        (hit.side === "south" && rayDirY > 0)
      ) {
        if (layer.animation) {
          const { frameCount, fps, frameWidth } = layer.animation;
          const currentFrame = Math.floor(currentTime * fps) % frameCount;
          texX = currentFrame * frameWidth + (frameWidth - 1 - Math.floor(hit.wallOffset * frameWidth));
        } else {
          texX = wallTexture.width - texX - 1;
        }
      }

      ctx.save();
      ctx.globalAlpha = layer.alpha ?? 1.0;
      ctx.globalCompositeOperation = layer.blendMode ?? "source-over";

      const sourceHeight = layer.animation ? layer.animation.frameHeight : wallTexture.height;
      ctx.drawImage(wallTexture, texX, 0, 1, sourceHeight, screenX, wallTop, 1, wallHeight);
      ctx.restore();
    }

    if (!renderedAny) {
      const baseIntensity = hit.side === "north" || hit.side === "south" ? 136 : 102;
      const shadedIntensity = Math.floor(baseIntensity * lightFactor);
      ctx.fillStyle = `rgb(${shadedIntensity}, ${shadedIntensity}, ${shadedIntensity})`;
      ctx.fillRect(screenX, wallTop, 1, wallHeight);
    } else {
      if (lightFactor < 1.0) {
        const darkness = 1.0 - lightFactor;
        ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
        ctx.fillRect(screenX, wallTop, 1, wallHeight);
      } else if (lightFactor > 1.0) {
        const brightness = lightFactor - 1.0;
        ctx.fillStyle = `rgba(255, 200, 100, ${Math.min(0.5, brightness)})`;
        ctx.fillRect(screenX, wallTop, 1, wallHeight);
      }
    }
  }

  private resolveItemTextureKey(itemId: string, keyId?: string): string {
    if (keyId) return "key";

    if (this.content) {
      const itemDef = this.content.getItem(itemId);
      if (itemDef?.textureKey) {
        return itemDef.textureKey.toString();
      }
    }

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
    yOffset: number = 0,
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
