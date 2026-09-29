import { Dungeon, DungeonManager } from "../Managers/DungeonManager";
import { StateStore } from "../../GameState";
import { GameState, Direction, WallDefinition, DungeonCellDefinition } from "../../GameTypes";

export interface InteractionResult {
  handled: boolean;
  type: "door" | "container" | "wall" | "none";
  message: string;
}

export class InteractionSystem {
  constructor(
    private readonly store: StateStore<GameState>,
    private readonly dungeonManager: DungeonManager,
  ) {}

  /**
   * Main entry point when player presses the interaction key ('E').
   */
  public interact(): InteractionResult {
    const dungeon = this.dungeonManager.current;
    if (!dungeon) {
      return { handled: false, type: "none", message: "No active dungeon." };
    }

    const state = this.store.get();
    const { x, y } = state.player.position;
    const facingDir = this.angleToDirection(state.player.facing);

    // Discrete cell coordinate the player is currently inside
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);

    // 1. Check wall directly in front of the player
    const wall = dungeon.getWall(cellX, cellY, facingDir);
    if (wall.type === "door") {
      return this.handleDoorInteraction(wall.doorId);
    }

    // 2. If no door on facing wall, inspect target cell directly ahead
    const targetCoords = this.getFacingCellCoords(cellX, cellY, facingDir);
    const targetCell = dungeon.getCell(targetCoords.x, targetCoords.y);

    if (targetCell) {
      // Check for containers or objects in the facing cell
      return this.handleCellInteraction(targetCoords.x, targetCoords.y, dungeon);
    }

    return { handled: false, type: "none", message: "Nothing to interact with." };
  }

  /**
   * Toggles doors between open, closed, and locked states directly in the StateStore.
   */
  private handleDoorInteraction(doorId: string): InteractionResult {
    // Read existing door state or default to closed/unlocked
    const existingDoor = this.store.get().dungeon.doors[doorId];
    const currentOpen = existingDoor?.open ?? false;
    const currentLocked = existingDoor?.locked ?? false;

    if (currentLocked) {
      const inventory = this.store.get("player.inventory");
      const hasKey = inventory.some(item => item === "master_key" || item === `key_${doorId}`);

      if (hasKey) {
        // Set the complete DoorState object or patch the path safely
        this.store.set(`dungeon.doors.${doorId}`, {
          open: true,
          locked: false,
        });

        return {
          handled: true,
          type: "door",
          message: `Unlocked and opened door (${doorId})!`,
        };
      }

      return {
        handled: false,
        type: "door",
        message: "The door is locked.",
      };
    }

    // Toggle open / closed state while preserving locked status
    this.store.set(`dungeon.doors.${doorId}`, {
      open: !currentOpen,
      locked: false,
    });

    return {
      handled: true,
      type: "door",
      message: !currentOpen ? "Opened door." : "Closed door.",
    };
  }

  /**
   * Handles interactive objects (e.g. chests / containers) in target cells.
   */
  private handleCellInteraction(cellX: number, cellY: number, dungeon: Dungeon): InteractionResult {
    const containerKey = `${cellX},${cellY}`;
    const containerState = this.store.get().dungeon.containers[containerKey];

    if (containerState) {
      if (containerState.opened) {
        return { handled: true, type: "container", message: "The chest is empty." };
      }

      // Update container state with proper ContainerState object signature
      this.store.batch(ctx => {
        ctx.set(`dungeon.containers.${containerKey}`, { opened: true });
        ctx.update("player.inventory", inv => [...inv, "gold_coins"]);
      });

      return {
        handled: true,
        type: "container",
        message: "Opened chest and found Gold Coins!",
      };
    }

    return { handled: false, type: "none", message: "Nothing here." };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private angleToDirection(angle: number): Direction {
    // Normalize angle to 0..2π
    const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    if (normalized >= (7 * Math.PI) / 4 || normalized < Math.PI / 4) return "east";
    if (normalized >= Math.PI / 4 && normalized < (3 * Math.PI) / 4) return "south";
    if (normalized >= (3 * Math.PI) / 4 && normalized < (5 * Math.PI) / 4) return "west";
    return "north";
  }

  private getFacingCellCoords(x: number, y: number, dir: Direction): { x: number; y: number } {
    switch (dir) {
      case "north":
        return { x, y: y - 1 };
      case "east":
        return { x: x + 1, y };
      case "south":
        return { x, y: y + 1 };
      case "west":
        return { x: x - 1, y };
    }
  }
}
