// InteractionSystem.ts
import { DungeonManager } from "../Managers/DungeonManager";
import { StateStore } from "../../GameState";
import { GameState, Direction, DungeonState } from "../../GameTypes";
import { InventorySystem } from "./InventorySystem";
import { ContentRegistry } from "../../Content/ContentRegistry";
import { QuestManager } from "../Managers/QuestManager";
import { CutSceneSystem } from "../Managers/CutScenes";
import { DungeonViewport } from "../../UI/DungeonViewport";
import { DungeonViewportGraphic } from "../../UI/DungeonViewportGraphic";

export interface InteractionResult {
  handled: boolean;
  type: "door" | "container" | "npc" | "wall" | "none";
  message: string;
}

const FACING_TO_DIRECTION: Direction[] = ["east", "south", "west", "north"];

export class InteractionSystem {
  constructor(
    private readonly store: StateStore<GameState>,
    private readonly dungeonManager: DungeonManager,
    private readonly inventorySystem: InventorySystem,
    private readonly contentRegistry: ContentRegistry,
    private readonly viewport: DungeonViewport,
    private readonly questManager?: QuestManager,
    private readonly cutSceneSystem?: CutSceneSystem,
  ) {}

  public async interact(): Promise<InteractionResult> {
    const dungeon = this.dungeonManager.current;
    if (!dungeon) return { handled: false, type: "none", message: "No active dungeon." };

    const state = this.store.get();
    const pos = state.player?.position;
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
      return { handled: false, type: "none", message: "Invalid player position." };
    }

    const { x, y } = pos;
    const facingRaw = state.player.facing as unknown;
    const facingDir: Direction =
      typeof facingRaw === "number" ? (FACING_TO_DIRECTION[facingRaw] ?? "east") : ((facingRaw as Direction) ?? "east");

    const cellX = Math.floor(x);
    const cellY = Math.floor(y);

    // 1. Check current cell player stands on (floor items/containers only)
    const currentCell = dungeon.getCell(cellX, cellY);
    if (currentCell) {
      const currentInteraction = await this.handleCellInteraction(cellX, cellY);
      if (currentInteraction.handled) return currentInteraction;
    }

    // 2. Check wall / door directly ahead
    const wall = dungeon.getWall(cellX, cellY, facingDir);
    if (wall?.type === "door" && wall.doorId) {
      const graphic = this.viewport.graphics.current as DungeonViewportGraphic;
      graphic?.flagDirty();
      return this.handleDoorInteraction(wall.doorId);
    }

    // Prevent talking to or interacting with anything on the facing tile through a solid wall
    if (wall?.type === "wall") {
      return { handled: false, type: "wall", message: "A solid wall blocks your way." };
    }

    // 3. Check facing cell directly ahead (NPC first, then items/containers)
    const targetCoords = this.getFacingCellCoords(cellX, cellY, facingDir);
    const targetCell = dungeon.getCell(targetCoords.x, targetCoords.y);

    if (targetCell) {
      const graphic = this.viewport.graphics.current as DungeonViewportGraphic;
      graphic?.flagDirty();

      const targetNpcInteraction = await this.handleNpcInteraction(targetCoords.x, targetCoords.y);
      if (targetNpcInteraction.handled) return targetNpcInteraction;

      const targetInteraction = await this.handleCellInteraction(targetCoords.x, targetCoords.y);
      if (targetInteraction.handled) return targetInteraction;
    }

    const graphic = this.viewport.graphics.current as DungeonViewportGraphic;
    graphic?.flagDirty();
    return { handled: false, type: "none", message: "Nothing to interact with." };
  }

  private async handleNpcInteraction(cellX: number, cellY: number): Promise<InteractionResult> {
    const state = this.store.get();
    const activeDungeonId = state.dungeon.current;
    const activeDungeonState = state.dungeon.registry[activeDungeonId] as DungeonState & {
      npcs?: Record<string, any>;
    };

    if (!activeDungeonState?.npcs) {
      return { handled: false, type: "none", message: "" };
    }

    const npc = Object.values(activeDungeonState.npcs).find(
      entry => entry && entry.active !== false && Math.floor(entry.position.x) === cellX && Math.floor(entry.position.y) === cellY,
    );

    if (!npc) {
      return { handled: false, type: "none", message: "" };
    }

    const npcDef =
      typeof (this.contentRegistry as any)?.getNpc === "function"
        ? (this.contentRegistry as any).getNpc(npc.definitionId ?? npc.id)
        : undefined;

    const npcName = npc.name ?? npcDef?.name ?? "Stranger";
    const cutsceneId = npc.cutsceneId ?? npcDef?.cutsceneId;
    const requiredFlag = npc.requiredFlag ?? npcDef?.requiredFlag;
    const succeedsFlag = npc.succeedsFlag ?? npcDef?.succeedsFlag;

    const storypoints = (state.storypoints ?? {}) as Record<string, unknown>;

    if (requiredFlag && !storypoints[requiredFlag]) {
      return {
        handled: true,
        type: "npc",
        message: `${npcName} has nothing to say right now.`,
      };
    }

    if (succeedsFlag && storypoints[succeedsFlag]) {
      return {
        handled: true,
        type: "npc",
        message: `${npcName} nods in recognition.`,
      };
    }

    if (cutsceneId && this.cutSceneSystem) {
      await this.cutSceneSystem.startCutScene(cutsceneId);
    }

    if (succeedsFlag) {
      this.store.update("storypoints", points => ({
        ...points,
        [succeedsFlag]: true,
      }));
    }

    const graphic = this.viewport.graphics.current as DungeonViewportGraphic;
    graphic?.flagDirty();

    return {
      handled: true,
      type: "npc",
      message: `Talking to ${npcName}...`,
    };
  }

  private handleDoorInteraction(doorId: string): InteractionResult {
    const state = this.store.get();
    const activeDungeonId = state.dungeon.current;
    const activeDungeonState = state.dungeon.registry[activeDungeonId] as DungeonState;

    if (!activeDungeonState) {
      return { handled: false, type: "door", message: "Active dungeon state not found." };
    }

    const existingDoor = activeDungeonState.doors[doorId];
    const currentOpen = existingDoor?.open ?? false;
    const currentLocked = existingDoor?.locked ?? false;

    const doorPath = `dungeon.registry.${activeDungeonId}.doors.${doorId}`;

    if (currentLocked) {
      const keyring = state.player.keyring ?? [];
      const connection = this.dungeonManager.current?.definition.connections.find(conn => conn.id === doorId);
      const requiredKey = connection?.requiredKey ?? `key_${doorId}`;

      const hasKey = keyring.includes("master_key") || keyring.includes(requiredKey);

      if (hasKey) {
        this.store.set(doorPath as any, {
          open: true,
          locked: false,
        });

        const graphic = this.viewport.graphics.current as DungeonViewportGraphic;
        graphic?.flagDirty();

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

    this.store.set(doorPath as any, {
      open: !currentOpen,
      locked: false,
    });

    const graphic = this.viewport.graphics.current as DungeonViewportGraphic;
    graphic?.flagDirty();

    return {
      handled: true,
      type: "door",
      message: !currentOpen ? "Opened door." : "Closed door.",
    };
  }

  private async handlePropContainerInteraction(cellX: number, cellY: number): Promise<InteractionResult | null> {
    const dungeonDef = this.dungeonManager.current?.definition;
    const propPlacement = dungeonDef?.props?.find(p => Math.floor(p.position.x) === cellX && Math.floor(p.position.y) === cellY);
    if (!propPlacement) return null;

    const propDef = this.contentRegistry.worldProps.get(propPlacement.definitionId);
    const baseContainer = propDef?.container;
    if (!baseContainer && !propPlacement.containerOverride) return null;

    const cfg = {
      ...baseContainer,
      ...propPlacement.containerOverride,
    };

    const state = this.store.get();
    const activeDungeonId = state.dungeon.current;
    const runtimeKey = propPlacement.id;
    const existingRuntime = state.dungeon.registry[activeDungeonId]?.props?.[runtimeKey];

    let isLocked = existingRuntime?.locked ?? cfg.locked ?? false;
    const alreadyOpened = existingRuntime?.opened ?? false;
    const alreadyLooted = existingRuntime?.looted ?? false;

    // 1. If locked, check keyring
    if (isLocked) {
      const keyring = state.player.keyring ?? [];
      const reqKey = cfg.requiredKeyId;
      const hasKey = Boolean(reqKey && (keyring.includes("master_key") || keyring.includes(reqKey)));

      if (!hasKey) {
        return {
          handled: true,
          type: "container",
          message: `${propDef?.name ?? "Container"} is locked.`,
        };
      }

      isLocked = false;
    }

    // 2. Grant contents once (if not already looted)
    if (!alreadyLooted) {
      const keyring = [...(state.player.keyring ?? [])];
      let addedAnyKey = false;

      for (const entry of cfg.items ?? []) {
        const qty = entry.quantity ?? 1;
        if (entry.keyId) {
          if (!keyring.includes(entry.keyId)) {
            keyring.push(entry.keyId);
            addedAnyKey = true;
          }
          this.questManager?.progressObjectives("collect", entry.keyId, 1);
        } else if (entry.itemId) {
          const res = this.inventorySystem.addItem(entry.itemId, qty);
          if (!res.success) {
            return {
              handled: true,
              type: "container",
              message: "Your inventory is overburdened!",
            };
          }
          this.questManager?.progressObjectives("collect", entry.itemId, qty);
        }
      }

      if (addedAnyKey) {
        this.store.set("player.keyring" as any, keyring);
      }

      if (cfg.gold && cfg.gold > 0) {
        this.store.update("player" as any, (player: any) => ({
          ...player,
          gold: (player.gold ?? 0) + cfg.gold!,
        }));
      }
    }

    // 3. Persist unlocked + opened + looted state
    this.store.set(`dungeon.registry.${activeDungeonId}.props.${runtimeKey}` as any, {
      locked: isLocked,
      opened: true,
      looted: true,
    });

    // 4. Trigger anchored cutscene if present and not blocked by alreadyOpened (or allow replay as desired)
    if (cfg.cutsceneId && this.cutSceneSystem && !alreadyOpened) {
      await this.cutSceneSystem.startCutScene(cfg.cutsceneId);
    }

    if (cfg.succeedsFlag) {
      this.store.update("storypoints", points => ({
        ...points,
        [cfg.succeedsFlag!]: true,
      }));
    }

    const graphic = this.viewport.graphics.current as DungeonViewportGraphic;
    graphic?.flagDirty();

    return {
      handled: true,
      type: "container",
      message: alreadyOpened ? `Checked ${propDef?.name ?? "container"}.` : `Opened ${propDef?.name ?? "container"}!`,
    };
  }

  private async handleCellInteraction(cellX: number, cellY: number): Promise<InteractionResult> {
    const coordKey = `${cellX},${cellY}`;
    const state = this.store.get();
    const activeDungeonId = state.dungeon.current;
    const activeDungeonState = state.dungeon.registry[activeDungeonId] as DungeonState & {
      props?: Record<string, { locked: boolean; opened: boolean; looted: boolean }>;
    };

    if (!activeDungeonState) {
      return { handled: false, type: "none", message: "Active dungeon state not found." };
    }

    const dungeonDef = this.dungeonManager.current?.definition;

    // -------------------------------------------------------------
    // 1. Check WorldProp container at (cellX, cellY) first
    // -------------------------------------------------------------
    const propPlacement = dungeonDef?.props?.find(p => Math.floor(p.position.x) === cellX && Math.floor(p.position.y) === cellY);

    if (propPlacement) {
      const propDef = this.contentRegistry.worldProps.get(propPlacement.definitionId);
      const containerCfg =
        propDef?.container || (propPlacement as { containerOverride?: Record<string, unknown> }).containerOverride
          ? {
              ...(propDef?.container ?? {}),
              ...((propPlacement as { containerOverride?: Record<string, unknown> }).containerOverride ?? {}),
            }
          : undefined;

      if (containerCfg) {
        const propRuntime = activeDungeonState.props?.[propPlacement.id];
        let isLocked = propRuntime?.locked ?? Boolean(containerCfg.locked);
        const alreadyOpened = propRuntime?.opened ?? false;
        const alreadyLooted = propRuntime?.looted ?? false;

        // Check lock state against player keyring
        if (isLocked) {
          const keyring = state.player.keyring ?? [];
          const reqKey = containerCfg.requiredKeyId as string | undefined;
          const hasKey = Boolean(reqKey && (keyring.includes("master_key") || keyring.includes(reqKey)));

          if (!hasKey) {
            return {
              handled: true,
              type: "container",
              message: `${propDef?.name ?? "Container"} is locked.`,
            };
          }

          isLocked = false;
        }

        // Grant keys, items, and gold once if not yet looted
        if (!alreadyLooted) {
          const keyring = [...(state.player.keyring ?? [])];
          let keyringChanged = false;

          const entries = (containerCfg.items ?? []) as Array<{
            itemId?: string;
            keyId?: string;
            quantity?: number;
          }>;

          for (const entry of entries) {
            const qty = entry.quantity ?? 1;

            if (entry.keyId) {
              if (!keyring.includes(entry.keyId)) {
                keyring.push(entry.keyId);
                keyringChanged = true;
              }
              this.questManager?.progressObjectives("collect", entry.keyId, 1);
            } else if (entry.itemId) {
              const addResult = this.inventorySystem.addItem(entry.itemId, qty);
              if (!addResult.success) {
                return {
                  handled: true,
                  type: "container",
                  message: "Your inventory is overburdened!",
                };
              }
              this.questManager?.progressObjectives("collect", entry.itemId, qty);
            }
          }

          const goldAmount = (containerCfg.gold as number | undefined) ?? 0;

          this.store.batch(ctx => {
            if (keyringChanged) {
              ctx.set("player.keyring", keyring);
            }
            if (goldAmount > 0) {
              ctx.update("player" as any, (player: any) => ({
                ...player,
                gold: (player?.gold ?? 0) + goldAmount,
              }));
            }
            ctx.set(`dungeon.registry.${activeDungeonId}.props.${propPlacement.id}` as any, {
              locked: isLocked,
              opened: true,
              looted: true,
            });
          });
        } else {
          this.store.set(`dungeon.registry.${activeDungeonId}.props.${propPlacement.id}` as any, {
            locked: isLocked,
            opened: true,
            looted: true,
          });
        }

        // Trigger anchored cutscene if configured
        const cutsceneId = containerCfg.cutsceneId as string | undefined;
        if (cutsceneId && this.cutSceneSystem && !alreadyOpened) {
          await this.cutSceneSystem.startCutScene(cutsceneId);
        }

        const succeedsFlag = containerCfg.succeedsFlag as string | undefined;
        if (succeedsFlag) {
          this.store.update("storypoints", points => ({
            ...points,
            [succeedsFlag]: true,
          }));
        }

        const graphic = this.viewport.graphics.current as DungeonViewportGraphic;
        graphic?.flagDirty();

        return {
          handled: true,
          type: "container",
          message: alreadyOpened ? `Checked ${propDef?.name ?? "container"}.` : `Opened ${propDef?.name ?? "container"}!`,
        };
      }
    }

    // -------------------------------------------------------------
    // 2. Existing floor container / item pickup fallback
    // -------------------------------------------------------------
    const containerState = activeDungeonState.containers?.[coordKey];
    if (containerState?.opened) {
      return { handled: false, type: "none", message: "Already collected." };
    }

    const itemPlacement = dungeonDef?.items?.find(i => i.position.x === cellX && i.position.y === cellY);

    const keyId = containerState?.keyId ?? itemPlacement?.keyId;
    const itemId = containerState?.itemId ?? itemPlacement?.id;
    const quantity = containerState?.quantity ?? itemPlacement?.quantity ?? 1;

    const containerPath = `dungeon.registry.${activeDungeonId}.containers.${coordKey}`;

    // Keys -> player.keyring
    if (keyId) {
      const keyring = state.player.keyring ?? [];

      this.store.batch(ctx => {
        if (!keyring.includes(keyId)) {
          ctx.set("player.keyring", [...keyring, keyId]);
        }
        ctx.set(containerPath as any, {
          ...(containerState ?? {}),
          opened: true,
        });
      });

      this.questManager?.progressObjectives("collect", keyId, 1);
      const graphic = this.viewport.graphics.current as DungeonViewportGraphic;
      graphic?.flagDirty();
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
        ctx.set(containerPath as any, {
          ...(containerState ?? {}),
          opened: true,
        });
      });

      this.questManager?.progressObjectives("collect", itemId, quantity);

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
