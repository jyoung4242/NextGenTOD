import {
  DungeonGridDefinition,
  DungeonCamera,
  RaycastHit,
  DungeonCellDefinition,
  WallDefinition,
  getDungeonCell,
  DungeonState,
} from "../GameTypes";

type WallSide = "north" | "east" | "south" | "west";

export class DungeonRaycaster {
  public cast(grid: DungeonGridDefinition, state: DungeonState, camera: DungeonCamera, rayAngle: number): RaycastHit | undefined {
    const rayDirX = Math.cos(rayAngle);
    const rayDirY = Math.sin(rayAngle);

    let mapX = Math.floor(camera.x);
    let mapY = Math.floor(camera.y);

    const deltaDistX = rayDirX === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / rayDirY);

    let stepX: number;
    let stepY: number;
    let sideDistX: number;
    let sideDistY: number;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (camera.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - camera.x) * deltaDistX;
    }

    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (camera.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - camera.y) * deltaDistY;
    }

    const opposite: Record<WallSide, WallSide> = {
      north: "south",
      south: "north",
      east: "west",
      west: "east",
    };

    while (true) {
      const prevX = mapX;
      const prevY = mapY;
      let wallSide: WallSide;

      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        wallSide = stepX > 0 ? "west" : "east";
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        wallSide = stepY > 0 ? "north" : "south";
      }

      const prev = getDungeonCell(grid, prevX, prevY);
      const cell = getDungeonCell(grid, mapX, mapY);

      let wall: WallDefinition | undefined;
      let owner = cell ?? prev;

      if (prev && prev[opposite[wallSide]].type !== "none") wall = prev[opposite[wallSide]];
      else if (cell && cell[wallSide].type !== "none") wall = cell[wallSide];
      else if (!cell) wall = { type: "wall", materialId: "void" };

      if (!wall) continue;
      if (!owner) return undefined;

      // ─── DOOR CHECK ───────────────────────────────────────────────────────
      // If the wall is a door and it is open, do not hit it — pass through!
      if (wall.type === "door") {
        const doorState = state.doors[wall.doorId];
        if (doorState?.open === true) {
          continue;
        }
      }

      const distance =
        wallSide === "west" || wallSide === "east"
          ? (mapX - camera.x + (1 - stepX) / 2) / rayDirX
          : (mapY - camera.y + (1 - stepY) / 2) / rayDirY;

      const hitX = camera.x + rayDirX * distance;
      const hitY = camera.y + rayDirY * distance;
      const wallOffset = wallSide === "west" || wallSide === "east" ? hitY - Math.floor(hitY) : hitX - Math.floor(hitX);

      return { distance, x: hitX, y: hitY, cellX: owner.x, cellY: owner.y, side: wallSide, wallOffset, wall };
    }
  }
}
