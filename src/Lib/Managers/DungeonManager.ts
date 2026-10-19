// DungeonManager.ts

import {
  DungeonState,
  DungeonCellDefinition,
  WallDefinition,
  Direction,
  DungeonGridDefinition,
  DungeonDefinition,
  getDungeonCell,
  GameState,
  ContainerState,
  DoorState,
  EnemyState,
} from "../../GameTypes";
import { StateStore } from "../../GameState";
import { ContentRegistry } from "../../Content/ContentRegistry";

export interface DungeonGenerator {
  generate(seed: number): DungeonDefinition;
}

export class DungeonManager {
  private dungeon?: Dungeon;

  /**
   * Loads or initializes a dungeon level by checking the multi-level state cache.
   * If it's the first time visiting this dungeon ID, it generates its runtime state.
   */
  public loadOrInitDungeon(definition: DungeonDefinition, state: StateStore<GameState>, contentRegistry?: ContentRegistry): void {
    const dungeonStore = state.get("dungeon");
    const existingState = dungeonStore.registry[definition.id];

    if (!existingState) {
      // First time visiting this dungeon level: generate and cache initial runtime state
      const newState = createDungeonState(definition, 0, contentRegistry);
      state.batch(ctx => {
        ctx.set("dungeon.current", definition.id);
        ctx.set(`dungeon.registry.${definition.id}`, newState);
      });
    } else {
      // Returning to a previously visited level: just update the current pointer
      state.set("dungeon.current", definition.id);
    }

    // Instantiate the runtime helper class bound to the store
    this.dungeon = new Dungeon(definition, state);
  }

  loadDungeon(definition: DungeonDefinition, state: StateStore<GameState>): void {
    this.dungeon = new Dungeon(definition, state);
  }

  unloadDungeon(): void {
    this.dungeon = undefined;
  }

  get current(): Dungeon | undefined {
    return this.dungeon;
  }
}

export class Dungeon {
  readonly grid: DungeonGrid;

  constructor(
    readonly definition: DungeonDefinition,
    private readonly store: StateStore<GameState>,
  ) {
    this.grid = new DungeonGrid(definition.grid);
  }

  getCell(x: number, y: number): DungeonCellDefinition | undefined {
    return this.grid.getCell(x, y);
  }

  getWall(x: number, y: number, direction: Direction): WallDefinition {
    return this.grid.getWall(x, y, direction);
  }

  canMove(x: number, y: number, direction: Direction): boolean {
    const wall = this.getWall(x, y, direction);

    switch (wall.type) {
      case "none":
        return true;
      case "wall":
        return false;
      case "door": {
        if (!wall.doorId) return false; // Guard against undefined doorId

        // Dynamically fetch state for the currently active dungeon level
        const gameState = this.store.get();
        const activeDungeonId = gameState.dungeon.current;
        const currentDungeonState = gameState.dungeon.registry[activeDungeonId];

        return currentDungeonState?.doors[wall.doorId]?.open === true;
      }
    }
  }
}

export class DungeonGrid {
  private readonly cells = new Map<string, DungeonCellDefinition>();

  constructor(private readonly definition: DungeonGridDefinition) {
    for (const cell of definition.cells) {
      this.cells.set(`${cell.x},${cell.y}`, cell);
    }
  }

  getCell(x: number, y: number): DungeonCellDefinition | undefined {
    if (x < 0 || y < 0 || x >= this.definition.width || y >= this.definition.height) {
      return undefined;
    }

    return this.cells.get(`${x},${y}`);
  }

  getWall(x: number, y: number, direction: Direction): WallDefinition {
    const cell = this.getCell(x, y);

    if (!cell) {
      return {
        type: "wall",
        textureKey: "void",
      };
    }

    return cell[direction];
  }
}

export function createDungeonState(definition: DungeonDefinition, seed = 0, contentRegistry?: ContentRegistry): DungeonState {
  const startNode = Object.values(definition.nodes).find(node => node.type === "entrance");
  if (!startNode) {
    throw new Error(`Dungeon "${definition.id}" has no entrance node`);
  }

  // 1. Automatically build door states from connections
  const doors: Record<string, DoorState> = {};
  for (const conn of definition.connections) {
    if (conn.type === "door" || conn.type === "locked") {
      doors[conn.id] = {
        open: false,
        locked: !!conn.requiredKey,
      };
    }
  }

  // 2. Automatically build container states from definition items
  const containers: Record<string, ContainerState> = {};
  if (definition.items) {
    for (const item of definition.items) {
      const coordKey = `${item.position.x},${item.position.y}`;
      containers[coordKey] = {
        opened: false,
      };
    }
  }

  // 3. Populate runtime enemy instances from dungeon definition
  const enemies: Record<string, EnemyState> = {};
  if (definition.enemies) {
    for (const spawn of definition.enemies) {
      const enemyDef = contentRegistry?.getEnemy(spawn.definitionId);
      const enemyHealth = enemyDef?.health ?? 100;

      enemies[spawn.id] = {
        definitionId: spawn.definitionId,
        hp: enemyHealth,
        maxHp: enemyHealth,
        nodeId: startNode.id,
        alive: true,
        facing: "east",
        position: {
          x: spawn.position.x,
          y: spawn.position.y,
        },
        state: "idle",
      };
    }
  }

  return {
    definitionId: definition.id,
    seed,
    currentNodeId: startNode.id,
    discoveredNodes: [startNode.id],
    visitedNodes: [startNode.id],
    doors,
    containers,
    enemies,
  };
}

export function applyConnectionsToGrid(definition: DungeonDefinition): void {
  for (const conn of definition.connections) {
    if (conn.type === "door" && conn.portal) {
      const { x, y, direction } = conn.portal;
      const cell = getDungeonCell(definition.grid, x, y);

      if (cell) {
        cell[direction] = {
          type: "door",
          doorId: conn.id,
        };

        const oppositeDir: Record<Direction, Direction> = {
          north: "south",
          south: "north",
          east: "west",
          west: "east",
        };

        let neighborX = x;
        let neighborY = y;
        if (direction === "north") neighborY--;
        if (direction === "south") neighborY++;
        if (direction === "east") neighborX++;
        if (direction === "west") neighborX--;

        const neighborCell = getDungeonCell(definition.grid, neighborX, neighborY);
        if (neighborCell) {
          neighborCell[oppositeDir[direction]] = {
            type: "door",
            doorId: conn.id,
          };
        }
      }
    }
  }
}
