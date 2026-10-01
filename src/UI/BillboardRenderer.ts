import { GameState, Direction, DungeonCamera } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";

const CARDINAL_ANGLES: Record<Direction, number> = {
  east: 0,
  south: Math.PI / 2,
  west: Math.PI,
  north: (3 * Math.PI) / 2,
};

export interface DrawBillboardParams {
  screenX: number;
  drawWidth: number;
  drawHeight: number;
  drawStartY: number;
  drawStartX: number;
  distance: number;
  textureUrl: string;
}

export class BillboardRenderer {
  constructor(private readonly contentRegistry: ContentRegistry) {}

  public calculateVisibleBillboards(
    state: GameState,
    camera: DungeonCamera, // Pass camera or derive angle strictly from state.player.facing
    screenWidth: number,
    screenHeight: number,
  ): DrawBillboardParams[] {
    const { x: px, y: py } = state.player.position;

    // Strict angle derivation: Use camera angle if available, or map cardinal Direction
    const playerAngle = camera?.angle ?? CARDINAL_ANGLES[state.player.facing];
    const fov = camera?.fov ?? Math.PI / 3;

    const enemies = state.dungeon?.enemies ?? {};

    // Camera direction vector
    const dirX = Math.cos(playerAngle);
    const dirY = Math.sin(playerAngle);

    // Camera plane perpendicular to direction vector
    const planeLength = Math.tan(fov / 2);
    const planeX = -dirY * planeLength;
    const planeY = dirX * planeLength;

    const calculated: DrawBillboardParams[] = [];

    for (const enemy of Object.values(enemies)) {
      if (enemy.state === "dead") continue;

      const def = this.contentRegistry.getEnemy(enemy.definitionId);
      if (!def) continue;

      const spriteX = enemy.position.x - px;
      const spriteY = enemy.position.y - py;

      // Inverse camera matrix projection
      const invDet = 1.0 / (planeX * dirY - dirX * planeY);
      const transformX = invDet * (dirY * spriteX - dirX * spriteY);
      const transformY = invDet * (-planeY * spriteX + planeX * spriteY);

      // Clip if behind camera plane
      if (transformY <= 0.1) continue;

      const spriteScreenX = Math.floor((screenWidth / 2) * (1 + transformX / transformY));
      const spriteHeight = Math.abs(Math.floor(screenHeight / transformY));
      const spriteWidth = Math.abs(Math.floor(screenHeight / transformY));

      const drawStartY = Math.floor(-spriteHeight / 2 + screenHeight / 2);
      const drawStartX = Math.floor(-spriteWidth / 2 + spriteScreenX);

      calculated.push({
        screenX: spriteScreenX,
        drawWidth: spriteWidth,
        drawHeight: spriteHeight,
        drawStartY,
        drawStartX,
        distance: transformY,
        textureUrl: def.spriteUrl,
      });
    }

    // Sort back-to-front
    return calculated.sort((a, b) => b.distance - a.distance);
  }
}
