//DungeonManager.ts

import {
  DungeonState,
  DungeonCellDefinition,
  WallDefinition,
  Direction,
  DungeonGridDefinition,
  DungeonDefinition,
  DungeonAsciiResult,
  getDungeonCell,
  GameState,
  ContainerState,
  DoorState,
} from "../../GameTypes";
import { StateStore } from "../../GameState"; // update import path as needed

export interface DungeonGenerator {
  generate(seed: number): DungeonDefinition;
}

export class DungeonManager {
  private dungeon?: Dungeon;

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
    private readonly store: StateStore<GameState>, // Pass StateStore instead of static state
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
        // Dynamic store check
        const currentDungeonState = this.store.get().dungeon;
        return currentDungeonState.doors[wall.doorId]?.open === true;
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
        materialId: "void",
      };
    }

    return cell[direction];
  }
}

export function createDungeonState(definition: DungeonDefinition, seed = 0): DungeonState {
  const startNode = Object.values(definition.nodes).find(node => node.type === "entrance");

  if (!startNode) {
    throw new Error(`Dungeon "${definition.id}" has no entrance node`);
  }

  const doors: Record<string, DoorState> = {};
  for (const conn of definition.connections) {
    if (conn.type === "door" || conn.type === "locked") {
      doors[conn.id] = {
        open: false,
        locked: !!conn.requiredKey, // True if a key is required
      };
    }
  }
  console.log(doors);

  const containers: Record<string, ContainerState> = {};
  if (definition.items) {
    for (const item of definition.items) {
      const coordKey = `${item.position.x},${item.position.y}`;
      containers[coordKey] = {
        opened: false,
      };
    }
  }

  return {
    definitionId: definition.id,
    seed,
    currentNodeId: startNode.id,
    discoveredNodes: [startNode.id],
    visitedNodes: [startNode.id],
    doors, // Now in scope!
    containers, // Now in scope!
    enemies: {},
  };
}

export function applyConnectionsToGrid(definition: DungeonDefinition): void {
  for (const conn of definition.connections) {
    if (conn.type === "door" && conn.portal) {
      const { x, y, direction } = conn.portal;
      const cell = getDungeonCell(definition.grid, x, y);

      if (cell) {
        // Assign door definition to the cell edge
        cell[direction] = {
          type: "door",
          doorId: conn.id,
        };

        // Also assign door definition to the neighboring cell's opposite edge
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
