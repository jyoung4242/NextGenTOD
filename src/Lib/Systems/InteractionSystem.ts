import { DungeonManager } from "../Managers/DungeonManager";
import { StateStore } from "../../GameState";
import { GameState, Direction } from "../../GameTypes";

export interface InteractionResult {
  handled: boolean;
  type: "door" | "container" | "wall" | "none";
  message: string;
}

const FACING_TO_DIRECTION: Direction[] = ["east", "south", "west", "north"];

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
    if (!dungeon) return { handled: false, type: "none", message: "No active dungeon." };

    const state = this.store.get();
    const { x, y } = state.player.position;

    // Directly use facing direction index stored by DungeonPlayer
    const facingDir = FACING_TO_DIRECTION[state.player.facing];

    // Use Math.round or Math.floor consistently depending on offset
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);

    // 1. First check the CURRENT cell the player is standing on (for floor items like keys)
    const currentCell = dungeon.getCell(cellX, cellY);
    if (currentCell) {
      const currentInteraction = this.handleCellInteraction(cellX, cellY);
      if (currentInteraction.handled) return currentInteraction;
    }

    // 2. Check facing wall / adjacent container
    const wall = dungeon.getWall(cellX, cellY, facingDir);
    if (wall.type === "door") {
      return this.handleDoorInteraction(wall.doorId);
    }

    const targetCoords = this.getFacingCellCoords(cellX, cellY, facingDir);
    const targetCell = dungeon.getCell(targetCoords.x, targetCoords.y);

    if (targetCell) {
      return this.handleCellInteraction(targetCoords.x, targetCoords.y);
    }

    return { handled: false, type: "none", message: "Nothing to interact with." };
  }

  /**
   * Toggles doors between open, closed, and locked states directly in the StateStore.
   */
  private handleDoorInteraction(doorId: string): InteractionResult {
    const existingDoor = this.store.get().dungeon.doors[doorId];
    const currentOpen = existingDoor?.open ?? false;
    const currentLocked = existingDoor?.locked ?? false;

    if (currentLocked) {
      const player = this.store.get().player;

      // 1. Safe extraction of keyring and inventory arrays
      const keyring = Array.isArray(player.keyring) ? player.keyring : Array.from(player.keyring ?? []);

      const inventory = Array.isArray(player.inventory) ? player.inventory : [];

      // 2. Fetch connection requirements or default to key_<doorId>
      const connection = this.dungeonManager.current?.definition.connections.find(c => c.id === doorId);
      const requiredKey = connection?.requiredKey ?? `key_${doorId}`;

      // 3. Verify key presence in keyring or inventory
      const hasKey =
        keyring.includes("master_key") ||
        keyring.includes(requiredKey) ||
        inventory.includes("master_key") ||
        inventory.includes(requiredKey);

      if (hasKey) {
        // Pass full DoorState object matching state store signature
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

    // Toggle open/closed state while providing a complete DoorState object
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
   * Handles interactive items, ground keys, and containers in target cells.
   */
  private handleCellInteraction(cellX: number, cellY: number): InteractionResult {
    const coordKey = `${cellX},${cellY}`;
    const state = this.store.get();

    // Check existing runtime container state in StateStore
    const containerState = state.dungeon?.containers?.[coordKey];

    // If container/item at this position was already opened/looted, skip
    if (containerState?.opened) {
      return { handled: false, type: "none", message: "Already collected." };
    }

    // Check static definition items array for key placement at (cellX, cellY)
    const dungeonDef = this.dungeonManager.current?.definition;
    const itemPlacement = dungeonDef?.items?.find(item => item.position.x === cellX && item.position.y === cellY);

    // If neither a runtime container state nor a static item definition exists here, fail
    if (!containerState && !itemPlacement) {
      return { handled: false, type: "none", message: "Nothing here." };
    }

    const keyToGrant = itemPlacement?.keyId ?? `key_${coordKey}`;

    // Update state store
    this.store.batch(ctx => {
      // Mark container/tile as opened so viewport & minimap stop rendering it
      ctx.set(`dungeon.containers.${coordKey}`, { opened: true });

      // Add key ID to player's keyring array
      ctx.update("player.keyring", (keyring = []) => [...keyring, keyToGrant]);
    });

    return {
      handled: true,
      type: "container",
      message: `Picked up ${keyToGrant}!`,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private angleToDirection(angle: number): Direction {
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
