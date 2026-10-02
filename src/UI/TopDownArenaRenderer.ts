// Rendering/TopDownArenaRenderer.ts
import { GameState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";

export class TopDownArenaRenderer {
  constructor(private readonly contentRegistry: ContentRegistry) {}

  public render(ctx: CanvasRenderingContext2D, state: GameState, tileSize: number = 48): void {
    const encounter = state.game.encounter;
    if (!encounter) return;

    const { minX, maxX, minY, maxY } = encounter.arenaBounds;
    const dungeon = state.dungeon;

    // Clear canvas
    ctx.fillStyle = "#111116";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const offsetX = (ctx.canvas.width - (maxX - minX + 1) * tileSize) / 2;
    const offsetY = (ctx.canvas.height - (maxY - minY + 1) * tileSize) / 2;

    // 1. Render Arena Floor and Walls
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const drawX = offsetX + (x - minX) * tileSize;
        const drawY = offsetY + (y - minY) * tileSize;

        // Render floor tile
        ctx.fillStyle = "#22252a";
        ctx.fillRect(drawX, drawY, tileSize - 1, tileSize - 1);

        // Grid lines
        ctx.strokeStyle = "#333740";
        ctx.strokeRect(drawX, drawY, tileSize, tileSize);
      }
    }

    // 2. Render Player Token
    const px = Math.floor(state.player.position.x);
    const py = Math.floor(state.player.position.y);
    if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
      const pDrawX = offsetX + (px - minX) * tileSize + tileSize / 2;
      const pDrawY = offsetY + (py - minY) * tileSize + tileSize / 2;

      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(pDrawX, pDrawY, tileSize / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#93c5fd";
      ctx.stroke();
    }

    // 3. Render Enemy Token
    const activeEnemy = dungeon.enemies[encounter.activeEnemyInstanceId];
    if (activeEnemy && activeEnemy.state !== "dead") {
      const ex = Math.floor(activeEnemy.position.x);
      const ey = Math.floor(activeEnemy.position.y);

      if (ex >= minX && ex <= maxX && ey >= minY && ey <= maxY) {
        const eDrawX = offsetX + (ex - minX) * tileSize + tileSize / 2;
        const eDrawY = offsetY + (ey - minY) * tileSize + tileSize / 2;

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(eDrawX, eDrawY, tileSize / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#fca5a5";
        ctx.stroke();
      }
    }
  }
}
