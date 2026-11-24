// UI/DungeonViewportGraphic.ts
import { ExcaliburGraphicsContext, Graphic } from "excalibur";
import { DungeonDefinition, DungeonCamera, DungeonState, WallLayer, RaycastHit, NPCDefinition } from "../GameTypes";
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

interface BillboardToRender {
  x: number;
  y: number;
  scale: number;
  textureKey: string;
  yOffset: number;
  distanceSq: number;
}

export class DungeonViewportGraphic extends Graphic {
  private readonly dungeon: DungeonDefinition;
  private readonly getState: () => DungeonState;
  private readonly camera: DungeonCamera;
  private readonly raycaster: DungeonRaycaster;
  private readonly textures: Map<string, HTMLImageElement>;
  private readonly content?: ContentRegistry;
  private readonly warnedTextureKeys = new Set<string>();
  private readonly warnedFallbackCells = new Set<string>();
  private readonly texturePixelCache = new WeakMap<HTMLImageElement, ImageData>();

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
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
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

  private warnOnce(bucket: Set<string>, dedupeKey: string, message: string): void {
    if (bucket.has(dedupeKey)) return;
    bucket.add(dedupeKey);
    console.warn(message);
  }

  private getImageData(img: HTMLImageElement): ImageData | null {
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
      return null;
    }

    const cached = this.texturePixelCache.get(img);
    if (cached) return cached;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return null;

    tempCtx.drawImage(img, 0, 0);
    const data = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    this.texturePixelCache.set(img, data);
    return data;
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
    // 1. Perspective Floor & Ceiling (with Fallbacks & Lighting)
    // -------------------------------------------------------------
    const floorImg = this.textures.get(this.dungeon.defaultFloorTexture ?? "dirt");
    const ceilingImg = this.textures.get(this.dungeon.defaultCeilingTexture ?? "ceiling");

    const floorPixelData = floorImg ? this.getImageData(floorImg) : null;
    const ceilingPixelData = ceilingImg ? this.getImageData(ceilingImg) : null;
    const horizonRow = Math.floor(halfHeight);

    if (floorPixelData || ceilingPixelData) {
      const frameImageData = ctx.getImageData(0, 0, width, height);
      const outPixels = frameImageData.data;

      const floorPixels = floorPixelData?.data;
      const floorW = floorPixelData?.width ?? 1;
      const floorH = floorPixelData?.height ?? 1;

      const ceilingPixels = ceilingPixelData?.data;
      const ceilingW = ceilingPixelData?.width ?? 1;
      const ceilingH = ceilingPixelData?.height ?? 1;

      const halfFov = this.camera.fov / 2;
      const rayDirX0 = Math.cos(this.camera.angle - halfFov);
      const rayDirY0 = Math.sin(this.camera.angle - halfFov);
      const rayDirX1 = Math.cos(this.camera.angle + halfFov);
      const rayDirY1 = Math.sin(this.camera.angle + halfFov);

      const planeHalfHeight = 0.5;

      for (let rowOffset = 1; horizonRow + rowOffset < height; rowOffset++) {
        const floorYScreen = horizonRow + rowOffset;
        const ceilingYScreen = horizonRow - rowOffset;
        const rowDistance = (planeHalfHeight * projectionPlane) / rowOffset;

        const floorStepX = (rowDistance * (rayDirX1 - rayDirX0)) / width;
        const floorStepY = (rowDistance * (rayDirY1 - rayDirY0)) / width;

        let worldX = this.camera.x + rowDistance * rayDirX0;
        let worldY = this.camera.y + rowDistance * rayDirY0;

        const distShade = Math.max(0, 1.0 - rowDistance / maxLightingDistance);
        const rowLight = Math.min(1.5, Math.max(ambientLight, ambientLight + (1.0 - ambientLight) * distShade));

        for (let screenX = 0; screenX < width; screenX++) {
          const fracX = ((worldX % 1) + 1) % 1;
          const fracY = ((worldY % 1) + 1) % 1;

          if (floorPixels) {
            const texX = Math.min(floorW - 1, Math.floor(fracX * floorW));
            const texY = Math.min(floorH - 1, Math.floor(fracY * floorH));
            const srcIdx = (texY * floorW + texX) * 4;
            const dstIdx = (floorYScreen * width + screenX) * 4;

            outPixels[dstIdx] = Math.min(255, Math.floor(floorPixels[srcIdx] * rowLight));
            outPixels[dstIdx + 1] = Math.min(255, Math.floor(floorPixels[srcIdx + 1] * rowLight));
            outPixels[dstIdx + 2] = Math.min(255, Math.floor(floorPixels[srcIdx + 2] * rowLight));
            outPixels[dstIdx + 3] = 255;
          }

          if (ceilingPixels && ceilingYScreen >= 0) {
            const texX = Math.min(ceilingW - 1, Math.floor(fracX * ceilingW));
            const texY = Math.min(ceilingH - 1, Math.floor(fracY * ceilingH));
            const srcIdx = (texY * ceilingW + texX) * 4;
            const dstIdx = (ceilingYScreen * width + screenX) * 4;

            outPixels[dstIdx] = Math.min(255, Math.floor(ceilingPixels[srcIdx] * rowLight));
            outPixels[dstIdx + 1] = Math.min(255, Math.floor(ceilingPixels[srcIdx + 1] * rowLight));
            outPixels[dstIdx + 2] = Math.min(255, Math.floor(ceilingPixels[srcIdx + 2] * rowLight));
            outPixels[dstIdx + 3] = 255;
          }

          worldX += floorStepX;
          worldY += floorStepY;
        }
      }

      ctx.putImageData(frameImageData, 0, 0);
    }

    if (!ceilingPixelData) {
      ctx.fillStyle = "#202020";
      ctx.fillRect(0, 0, width, horizonRow);

      if (ambientLight < 1.0) {
        const ceilingGradient = ctx.createLinearGradient(0, 0, 0, horizonRow);
        ceilingGradient.addColorStop(0.0, "rgba(0, 0, 0, 1.0)");
        ceilingGradient.addColorStop(0.2, `rgba(0, 0, 0, ${1.0 - ambientLight})`);
        ceilingGradient.addColorStop(1.0, `rgba(0, 0, 0, ${1.0 - ambientLight})`);
        ctx.fillStyle = ceilingGradient;
        ctx.fillRect(0, 0, width, horizonRow);
      }
    }

    if (!floorPixelData) {
      ctx.fillStyle = "#101010";
      ctx.fillRect(0, horizonRow, width, height - horizonRow);

      if (ambientLight < 1.0) {
        const floorGradient = ctx.createLinearGradient(0, horizonRow, 0, height);
        floorGradient.addColorStop(0.0, `rgba(0, 0, 0, ${1.0 - ambientLight})`);
        floorGradient.addColorStop(0.5, `rgba(0, 0, 0, ${1.0 - ambientLight})`);
        floorGradient.addColorStop(1.0, "rgba(0, 0, 0, 1.0)");
        ctx.fillStyle = floorGradient;
        ctx.fillRect(0, horizonRow, width, height - horizonRow);
      }
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
    // 2. Prepare Billboards (Items, Enemies, and NPCs)
    // -------------------------------------------------------------
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

    const npcsCache = (currentState as { npcs?: Record<string, NPCDefinition> }).npcs ?? {};
    const activeNpcs = Object.values(npcsCache).filter(npc => npc);

    for (const npc of activeNpcs) {
      const npcDef = typeof (this.content as any)?.getNpc === "function" ? (this.content as any).getNpc(npc.id) : undefined;
      const textureKey = npc.textureKey ?? npcDef?.textureKey ?? npcDef?.avatarKey ?? "npc";
      const scale = npc.scale ?? npcDef?.scale ?? 0.6;
      const yOffset = npc.yOffset ?? npcDef?.yOffset ?? 0.2;

      const worldX = npc.position.x + 0.5;
      const worldY = npc.position.y + 0.5;
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
    for (const col of columnHits) {
      const { screenX, rayAngle, hits } = col;
      const backgroundHits = hits.filter(hit => {
        if (hit.wall.type === "door" && hit.wall.doorId) {
          return currentState.doors[hit.wall.doorId]?.open !== true;
        }
        return true;
      });

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
          height,
        );
      }
    }

    // Pass 2: Draw Billboards (NPCs / Enemies / Items standing in rooms/doorways)
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

    // Pass 3: Draw Open Doors / Gates LAST so they correctly overlay over entities
    for (const col of columnHits) {
      const { screenX, rayAngle, hits } = col;
      for (const hit of hits) {
        if (hit.wall.type === "door" && hit.wall.doorId && currentState.doors[hit.wall.doorId]?.open === true) {
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
      } else if (hit.wall.layers && hit.wall.layers.length > 0) {
        activeLayers = hit.wall.layers;
      } else {
        const closedTex =
          hit.wall.closedTexture ?? (Array.isArray(hit.wall.textureKey) ? hit.wall.textureKey[0] : (hit.wall.textureKey ?? "door"));
        activeLayers = [{ textureKey: closedTex, alpha: 1.0, blendMode: "source-over" }];
      }
    } else if (hit.wall.layers && hit.wall.layers.length > 0) {
      activeLayers = hit.wall.layers.map(layer => ({
        ...layer,
        textureKey:
          !layer.textureKey || layer.textureKey === "wall" || layer.textureKey === "stone"
            ? getConsistentWallTexture(
                hit.cellX,
                hit.cellY,
                hit.side,
                this.dungeon.wallTextures,
                this.dungeon.defaultWallTexture,
                (msg, key) => this.warnOnce(this.warnedFallbackCells, key, msg),
              )
            : layer.textureKey,
      }));
    } else if (hit.wall.textureKey) {
      if (Array.isArray(hit.wall.textureKey)) {
        activeLayers = hit.wall.textureKey.map((key, index) => ({
          textureKey:
            !key || key === "wall" || key === "stone"
              ? getConsistentWallTexture(
                  hit.cellX,
                  hit.cellY,
                  hit.side,
                  this.dungeon.wallTextures,
                  this.dungeon.defaultWallTexture,
                  (msg, dedupeKey) => this.warnOnce(this.warnedFallbackCells, dedupeKey, msg),
                )
              : key,
          alpha: 1.0,
          blendMode: index > 0 ? "screen" : "source-over",
        }));
      } else {
        const key = hit.wall.textureKey;
        const resolvedKey =
          !key || key === "wall" || key === "stone"
            ? getConsistentWallTexture(
                hit.cellX,
                hit.cellY,
                hit.side,
                this.dungeon.wallTextures,
                this.dungeon.defaultWallTexture,
                (msg, dedupeKey) => this.warnOnce(this.warnedFallbackCells, dedupeKey, msg),
              )
            : key;
        activeLayers = [{ textureKey: resolvedKey, alpha: 1.0, blendMode: "source-over" }];
      }
    } else {
      this.warnOnce(
        this.warnedFallbackCells,
        `generic:${hit.cellX},${hit.cellY}:${hit.side}`,
        `[WallTexture Fallback] Generic wall at (${hit.cellX}, ${hit.cellY}) [${hit.side}] -> defaultWallTexture="${this.dungeon.defaultWallTexture ?? "none"}", wallTextures=${JSON.stringify(this.dungeon.wallTextures)}`,
      );
      const resolvedKey = getConsistentWallTexture(
        hit.cellX,
        hit.cellY,
        hit.side,
        this.dungeon.wallTextures,
        this.dungeon.defaultWallTexture,
        (msg, dedupeKey) => this.warnOnce(this.warnedFallbackCells, dedupeKey, msg),
      );
      activeLayers = [{ textureKey: resolvedKey, alpha: 1.0, blendMode: "source-over" }];
    }

    let lightFactor = Math.max(0, 1.0 - correctedDistance / maxLightingDistance);
    lightFactor = ambientLight + (1.0 - ambientLight) * lightFactor;

    for (const light of activeLights) {
      const distToLight = Math.hypot(hit.x - light.x, hit.y - light.y);
      if (distToLight < light.radius) {
        const attenuation = 1.0 - distToLight / light.radius;
        let effectiveIntensity = light.intensity ?? 1.0;

        if (light.flicker?.enabled) {
          const speed = light.flicker.speed ?? 15.0;
          const amount = light.flicker.intensity ?? 0.1;
          const phase = ((light.x * 12.9898 + light.y * 78.233) % Math.PI) * 2;
          const time = currentTime * speed + phase;
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
      if (!wallTexture) {
        this.warnOnce(
          this.warnedTextureKeys,
          `missing:${layer.textureKey}`,
          `[Missing Texture] Key "${layer.textureKey}" not found in textures map (first seen at (${hit.cellX}, ${hit.cellY}) [${hit.side}])`,
        );
        continue;
      }

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

      texX = Math.max(0, Math.min(wallTexture.width - 1, texX));

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
    } else if (lightFactor < 1.0) {
      const darkness = 1.0 - lightFactor;
      ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
      ctx.fillRect(screenX, wallTop, 1, wallHeight);
    } else if (lightFactor > 1.0) {
      const brightness = lightFactor - 1.0;
      ctx.fillStyle = `rgba(255, 200, 100, ${Math.min(0.5, brightness)})`;
      ctx.fillRect(screenX, wallTop, 1, wallHeight);
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
          const texX = Math.max(0, Math.min(img.width - 1, Math.floor(((col - startX) / spriteSize) * img.width)));
          ctx.drawImage(img, texX, 0, 1, img.height, col, spriteTop, 1, spriteSize);
        }
      }
    }
  }
}

function getConsistentWallTexture(
  cellX: number,
  cellY: number,
  side: string,
  wallPool?: string[],
  defaultWallTexture?: string,
  onWarn?: (message: string, dedupeKey: string) => void,
): string {
  const hasPool = Boolean(wallPool && wallPool.length > 0);
  if (!hasPool) {
    onWarn?.(
      `[WallTexture Fallback] No wallTextures pool at (${cellX}, ${cellY}) [${side}]. defaultWallTexture="${defaultWallTexture ?? "none"}"`,
      `pool:${cellX},${cellY}:${side}:${defaultWallTexture ?? ""}`,
    );
  }
  const pool = hasPool ? wallPool! : [defaultWallTexture ?? "stone"];
  const seed = Math.abs((cellX * 73856093) ^ (cellY * 19349663) ^ (side.charCodeAt(0) * 83492791));
  return pool[seed % pool.length];
}
