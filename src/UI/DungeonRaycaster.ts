// DungeonRaycaster.ts
import {
  DungeonGridDefinition,
  DungeonCamera,
  RaycastHit,
  WallDefinition,
  getDungeonCell,
  DungeonState,
  DungeonDefinition,
} from "../GameTypes";

type WallSide = "north" | "east" | "south" | "west";

export class DungeonRaycaster {
  public cast(
    grid: DungeonGridDefinition,
    state: DungeonState,
    dungeonDef: DungeonDefinition,
    camera: DungeonCamera,
    rayAngle: number,
  ): RaycastHit[] {
    const hits: RaycastHit[] = [];

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

    // Prevent infinite loops in open voids
    let maxSteps = 50;

    while (maxSteps > 0) {
      maxSteps--;
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

      if (prev && prev[opposite[wallSide]].type !== "none") {
        wall = prev[opposite[wallSide]];
      } else if (cell && cell[wallSide].type !== "none") {
        wall = cell[wallSide];
      } else if (!cell) {
        wall = { type: "wall", textureKey: "void" };
      }

      if (!wall) continue;
      if (!owner) break;

      // Calculate distance and hit coordinates
      const distance =
        wallSide === "west" || wallSide === "east"
          ? (mapX - camera.x + (1 - stepX) / 2) / rayDirX
          : (mapY - camera.y + (1 - stepY) / 2) / rayDirY;

      const hitX = camera.x + rayDirX * distance;
      const hitY = camera.y + rayDirY * distance;
      const wallOffset = wallSide === "west" || wallSide === "east" ? hitY - Math.floor(hitY) : hitX - Math.floor(hitX);

      // ─── CHECK CONNECTIONS FOR CUSTOM TEXTURES & SKIP RAYCAST ──────────────
      let matchedConnection = dungeonDef.connections?.find(
        conn => conn.portal && conn.portal.x === owner.x && conn.portal.y === owner.y && conn.portal.direction === wallSide,
      );

      let effectiveWall = { ...wall };
      if (matchedConnection?.closedTexture) {
        effectiveWall.layers = [{ textureKey: matchedConnection.closedTexture, alpha: 1.0 }];
      }

      // ─── DOOR / PASS-THROUGH LOGIC ───────────────────────────────────────
      let isOpenDoor = false;
      if (wall.type === "door" && wall.doorId) {
        const doorState = state.doors[wall.doorId];
        if (doorState?.open === true) {
          isOpenDoor = true;
        }
      }

      if (matchedConnection?.skipRaycast || isOpenDoor) {
        // Record this pass-through hit (e.g. metal gate or open portal frame) but KEEP CASTING
        hits.push({
          distance,
          x: hitX,
          y: hitY,
          cellX: owner.x,
          cellY: owner.y,
          side: wallSide,
          wallOffset,
          wall: effectiveWall,
        });
        continue; // Ray continues marching to find the solid wall behind it!
      }

      // Solid hit: record and terminate ray
      hits.push({
        distance,
        x: hitX,
        y: hitY,
        cellX: owner.x,
        cellY: owner.y,
        side: wallSide,
        wallOffset,
        wall: effectiveWall,
      });
      break;
    }

    return hits;
  }
}
