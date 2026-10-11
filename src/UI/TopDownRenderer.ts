// Rendering/TopDownArenaRenderer.ts
import { GameState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";
import { getLoadedTextures } from "../resources";

export class TopDownArenaRenderer {
  constructor(private readonly contentRegistry: ContentRegistry) {}

  public render(ctx: CanvasRenderingContext2D, state: GameState, tileSize: number = 48): void {
    const encounter = state.game.encounter;
    if (!encounter) return;

    const { minX, maxX, minY, maxY } = encounter.arenaBounds;
    const dungeon = state.dungeon;

    // Clear viewport background
    ctx.fillStyle = "#111116";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const offsetX = (ctx.canvas.width - (maxX - minX + 1) * tileSize) / 2;
    const offsetY = (ctx.canvas.height - (maxY - minY + 1) * tileSize) / 2;

    // 1. Grid & Floor Tiles
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const drawX = offsetX + (x - minX) * tileSize;
        const drawY = offsetY + (y - minY) * tileSize;

        ctx.fillStyle = "#22252a";
        ctx.fillRect(drawX, drawY, tileSize - 1, tileSize - 1);

        ctx.strokeStyle = "#333740";
        ctx.strokeRect(drawX, drawY, tileSize, tileSize);
      }
    }

    const textures = getLoadedTextures();
    const padding = tileSize * 0.15; // Padding so token sits nicely inside the tile

    // 2. Player Token (Sprite)
    const px = Math.floor(state.player.position.x);
    const py = Math.floor(state.player.position.y);
    if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
      const pDrawX = offsetX + (px - minX) * tileSize;
      const pDrawY = offsetY + (py - minY) * tileSize;

      const playerTokenImg = textures.get("goblinToken");
      if (playerTokenImg && playerTokenImg.complete && playerTokenImg.naturalWidth !== 0) {
        ctx.drawImage(playerTokenImg, pDrawX + padding, pDrawY + padding, tileSize - padding * 2, tileSize - padding * 2);
      }
    }

    // 3. Enemy Token (Sprite dynamically resolved from enemy definition's tokenKey)
    const activeEnemy = dungeon.enemies[encounter.activeEnemyInstanceId];
    if (activeEnemy && activeEnemy.alive) {
      const ex = Math.floor(activeEnemy.position.x);
      const ey = Math.floor(activeEnemy.position.y);

      if (ex >= minX && ex <= maxX && ey >= minY && ey <= maxY) {
        const eDrawX = offsetX + (ex - minX) * tileSize;
        const eDrawY = offsetY + (ey - minY) * tileSize; // Fixed `dy` typo here

        const enemyDef = this.contentRegistry.getEnemy(activeEnemy.definitionId);
        const tokenKey = enemyDef?.tokenKey ?? "goblinToken";
        const tokenImg = textures.get(tokenKey);

        if (tokenImg && tokenImg.complete && tokenImg.naturalWidth !== 0) {
          ctx.drawImage(tokenImg, eDrawX + padding, eDrawY + padding, tileSize - padding * 2, tileSize - padding * 2);
        }
      }
    }
  }
}
