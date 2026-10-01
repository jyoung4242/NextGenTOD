import { DungeonManager } from "../Managers/DungeonManager";
import { StateStore } from "../../GameState";
import { GameState, Direction } from "../../GameTypes";
import { InventorySystem } from "./InventorySystem";
import { ContentRegistry } from "../../Content/ContentRegistry";

export interface InteractionResult {
  handled: boolean;
  type: "door" | "container" | "wall" | "none";
  message: string;
}

// 0: East, 1: South, 2: West, 3: North
const FACING_TO_DIRECTION: Direction[] = ["east", "south", "west", "north"];

export class InteractionSystem {
  constructor(
    private readonly store: StateStore<GameState>,
    private readonly dungeonManager: DungeonManager,
    private readonly inventorySystem: InventorySystem,
    private readonly contentRegistry: ContentRegistry,
  ) {}

  public interact(): InteractionResult {
    const dungeon = this.dungeonManager.current;
    if (!dungeon) return { handled: false, type: "none", message: "No active dungeon." };

    const state = this.store.get();

    // Safe extraction of player position
    const pos = state.player?.position;
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
      return { handled: false, type: "none", message: "Invalid player position." };
    }

    const { x, y } = pos;

    // Convert state.player.facing (number or string) into a valid Direction string
    const facingRaw = state.player.facing as unknown;
    const facingDir: Direction =
      typeof facingRaw === "number" ? (FACING_TO_DIRECTION[facingRaw] ?? "east") : ((facingRaw as Direction) ?? "east");

    const cellX = Math.floor(x);
    const cellY = Math.floor(y);

    // 1. Check current cell player stands on
    const currentCell = dungeon.getCell(cellX, cellY);
    if (currentCell) {
      const currentInteraction = this.handleCellInteraction(cellX, cellY);
      if (currentInteraction.handled) return currentInteraction;
    }

    // 2. Check facing wall / door
    const wall = dungeon.getWall(cellX, cellY, facingDir);
    if (wall?.type === "door") {
      return this.handleDoorInteraction(wall.doorId);
    }

    // 3. Check target cell directly ahead
    const targetCoords = this.getFacingCellCoords(cellX, cellY, facingDir);
    const targetCell = dungeon.getCell(targetCoords.x, targetCoords.y);

    if (targetCell) {
      const targetInteraction = this.handleCellInteraction(targetCoords.x, targetCoords.y);
      if (targetInteraction.handled) return targetInteraction;
    }

    return { handled: false, type: "none", message: "Nothing to interact with." };
  }

  private handleDoorInteraction(doorId: string): InteractionResult {
    const existingDoor = this.store.get().dungeon.doors[doorId];
    const currentOpen = existingDoor?.open ?? false;
    const currentLocked = existingDoor?.locked ?? false;

    if (currentLocked) {
      const keyring = this.store.get().player.keyring ?? [];

      const connection = this.dungeonManager.current?.definition.connections.find(conn => conn.id === doorId);
      const requiredKey = connection?.requiredKey ?? `key_${doorId}`;

      const hasKey = keyring.includes("master_key") || keyring.includes(requiredKey);

      if (hasKey) {
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
        message: "The door is locked. You need a key.",
      };
    }

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

  private handleCellInteraction(cellX: number, cellY: number): InteractionResult {
    const coordKey = `${cellX},${cellY}`;
    const state = this.store.get();

    const containerState = state.dungeon?.containers?.[coordKey];
    if (containerState?.opened) {
      return { handled: false, type: "none", message: "Already collected." };
    }

    const dungeonDef = this.dungeonManager.current?.definition;
    const itemPlacement = dungeonDef?.items?.find(i => i.position.x === cellX && i.position.y === cellY);

    const keyId = containerState?.keyId ?? itemPlacement?.keyId;
    const itemId = containerState?.itemId ?? itemPlacement?.id;
    const quantity = containerState?.quantity ?? itemPlacement?.quantity ?? 1;

    // Keys -> player.keyring
    if (keyId) {
      const keyring = this.store.get().player.keyring ?? [];

      this.store.batch(ctx => {
        if (!keyring.includes(keyId)) {
          ctx.set("player.keyring", [...keyring, keyId]);
        }
        ctx.set(`dungeon.containers.${coordKey}`, {
          ...containerState,
          opened: true,
        });
      });

      return {
        handled: true,
        type: "container",
        message: `Picked up key: ${keyId}!`,
      };
    }

    // Items -> InventorySystem
    if (itemId) {
      const result = this.inventorySystem.addItem(itemId, quantity);

      if (!result.success) {
        return {
          handled: true,
          type: "container",
          message: "Your inventory is overburdened!",
        };
      }

      this.store.batch(ctx => {
        ctx.set(`dungeon.containers.${coordKey}`, {
          ...containerState,
          opened: true,
        });
      });

      const itemDef = this.contentRegistry.getItem(itemId);
      return {
        handled: true,
        type: "container",
        message: `Picked up ${itemDef?.name ?? itemId}!`,
      };
    }

    return { handled: false, type: "none", message: "Nothing here." };
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
