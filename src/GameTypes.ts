//GameTypes.ts

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SkillDefinition {
  id: string;
}

export interface EntityPosition {
  nodeId?: string;
  x: number;
  y: number;
}

export interface EnemyState {
  definitionId: string;
  hp: number;
  maxHp: number;
  nodeId: string;
  alive: boolean;
  position: EntityPosition;
  facing: Direction;
  state: "idle" | "alert" | "dead";
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  position: EntityPosition;
  facing: Direction;
  keyring: string[];
  inventory: InventoryState;
  skills: Record<string, SkillState>;
}

export interface SkillState {
  level: number;
  unlocked: boolean;
}

// GameTypes.ts

export interface ContainerState {
  opened: boolean;
  keyId?: string; // e.g., "key_east-to-boss" (routes directly to player.keyring)
  itemId?: string; // e.g., "potion_health_minor" (routes through InventorySystem)
  quantity?: number; // Optional stack size (defaults to 1 if omitted)
}

export interface QuestState {
  started: boolean;
  completed: boolean;

  objectives: Record<string, ObjectiveState>;
}

export interface ObjectiveState {
  completed: boolean;
  progress: number;
}

export interface ProgressionState {
  experience: number;
  level: number;
  skillPoints: number;
}

export type GameMode = "playing" | "paused" | "dead" | "victory";

export interface GameSessionState {
  mode: GameMode;
  time: number;
}

export interface GameState {
  game: GameSessionState;
  player: PlayerState;
  dungeon: DungeonState;
  quests: {
    active: Record<string, QuestState>;
    completed: string[];
  };
  progression: ProgressionState;
}

// Dungeon Types & Interfaces

export interface DungeonState {
  definitionId: string;
  seed: number;

  currentNodeId: string;

  discoveredNodes: string[];
  visitedNodes: string[];

  doors: Record<string, DoorState>;
  containers: Record<string, ContainerState>;
  enemies: Record<string, EnemyState>;
}

export interface DungeonNodeDefinition {
  id: string;

  type: "room" | "corridor" | "stairs" | "entrance" | "special";

  bounds: Rect;

  exits: string[];
}

export type FloorType = "floor" | "void";

export interface DungeonPortal {
  x: number;
  y: number;
  direction: Direction;
}

export interface DungeonItemPlacement {
  id: string;
  keyId?: string;
  position: { x: number; y: number };
  quantity: number;
}

export interface DungeonEnemyPlacement {
  id: string; // Unique instance ID (e.g., "enemy-alcove-1")
  definitionId: string; // References EnemyDefinition.id registered in ContentRegistry
  position: { x: number; y: number };
}

export interface DungeonDefinition {
  id: string;
  nodes: Record<string, DungeonNodeDefinition>;
  connections: DungeonConnectionDefinition[];
  grid: DungeonGridDefinition;
  items?: DungeonItemPlacement[]; // Placed keys/items in the dungeon[cite: 3]
  enemies?: DungeonEnemyPlacement[]; // Placed static enemies in the dungeon
}

export interface DungeonConnectionDefinition {
  id: string;
  from: string;
  to: string;
  type: "open" | "door" | "stairs" | "locked" | "secret";
  requiredKey?: string; // e.g. "key_east-to-boss"
  portal?: DungeonPortal;
}

export interface DungeonCellDefinition {
  x: number;
  y: number;

  floor: FloorType;
  north: WallDefinition;
  east: WallDefinition;
  south: WallDefinition;
  west: WallDefinition;
}

export interface DoorState {
  open: boolean;
  locked: boolean;
}

export type WallDefinition =
  | {
      type: "none";
    }
  | {
      type: "wall";
      materialId: string;
    }
  | {
      type: "door";
      doorId: string;
    };

export interface GridPosition {
  x: number;
  y: number;
}

export interface WorldPosition {
  x: number;
  y: number;
}

export type Direction = "north" | "east" | "south" | "west";

export interface DungeonSpatialQuery {
  getCell(x: number, y: number): DungeonCellDefinition | undefined;
  getObjectAt(): void;
  getWall(x: number, y: number, direction: Direction): WallDefinition;
}

export interface DungeonGridDefinition {
  width: number;
  height: number;
  cells: DungeonCellDefinition[];
}

export interface DungeonPosition {
  x: number;
  y: number;
}

export interface DungeonAsciiOptions {
  wall?: string;
  floor?: string;
}

export interface DungeonAsciiResult {
  grid: DungeonGridDefinition;
  markers: DungeonAsciiMarker[];
}

export type DungeonAsciiMarkerType = "start" | "door" | "boss" | "container" | "enemy" | "stairs-up" | "stairs-down";

export interface DungeonAsciiMarker {
  id?: string;
  type: DungeonAsciiMarkerType;
  x: number;
  y: number;
}
export interface DungeonAsciiOptions {
  wallMaterialId?: string;
}

export function dungeonFromAscii(ascii: string, options: DungeonAsciiOptions = {}): DungeonGridDefinition {
  const wall = options.wall ?? "#";
  const floor = options.floor ?? " ";
  const wallMaterialId = options.wallMaterialId ?? "stone";

  const lines = ascii
    .trim()
    .split("\n")
    .map(line => line.trimEnd());

  const height = lines.length;
  const width = Math.max(...lines.map(line => line.length));

  const cells: DungeonCellDefinition[] = [];

  for (let y = 0; y < height; y++) {
    const line = lines[y].padEnd(width, wall);

    for (let x = 0; x < width; x++) {
      if (line[x] !== floor) {
        continue;
      }

      cells.push({
        x,
        y,
        floor: "floor",

        north: createWall(lines, x, y - 1, width, wall, floor, wallMaterialId),

        east: createWall(lines, x + 1, y, width, wall, floor, wallMaterialId),

        south: createWall(lines, x, y + 1, width, wall, floor, wallMaterialId),

        west: createWall(lines, x - 1, y, width, wall, floor, wallMaterialId),
      });
    }
  }

  return {
    width,
    height,
    cells,
  };
}

function createWall(
  lines: string[],
  x: number,
  y: number,
  width: number,
  wall: string,
  floor: string,
  materialId: string,
): DungeonCellDefinition["north"] {
  if (isFloor(lines, x, y, width, wall, floor)) {
    return {
      type: "none",
    };
  }

  return {
    type: "wall",
    materialId,
  };
}

function isFloor(lines: string[], x: number, y: number, width: number, wall: string, floor: string): boolean {
  if (x < 0 || y < 0 || y >= lines.length || x >= width) {
    return false;
  }

  return lines[y][x] === floor;
}

// Raycasting 1st Person View

export interface DungeonCamera {
  x: number;
  y: number;
  angle: number;

  fov: number;
}

export const camera: DungeonCamera = {
  x: 3.5,
  y: 3.5,
  angle: 0,
  fov: Math.PI / 3,
};
export interface RaycastHit {
  distance: number;

  x: number;
  y: number;

  cellX: number;
  cellY: number;

  side: "north" | "east" | "south" | "west";

  wallOffset: number;

  wall: WallDefinition;
}

const cellIndex = new WeakMap<DungeonGridDefinition, Map<number, DungeonCellDefinition>>();

export function getDungeonCell(grid: DungeonGridDefinition, x: number, y: number): DungeonCellDefinition | undefined {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return undefined;
  }

  let index = cellIndex.get(grid);
  if (!index) {
    index = new Map();
    for (const cell of grid.cells) {
      index.set(cell.y * grid.width + cell.x, cell);
    }
    cellIndex.set(grid, index);
  }

  return index.get(y * grid.width + x);
}

export interface DungeonViewportGraphicOptions {
  dungeon: DungeonDefinition;
  camera: DungeonCamera;

  width: number;
  height: number;
}

export function createDungeonCamera(x: number, y: number): DungeonCamera {
  return {
    x,
    y,
    angle: 0,
    fov: Math.PI / 3,
  };
}

// --- Static Content Definitions ---
export type ItemCategory = "consumable" | "equipment" | "material" | "junk";

export interface ItemDefinition {
  id: string; // Unique ID (e.g., "potion_health_minor")
  name: string;
  description: string;
  category: ItemCategory;
  stackable: boolean;
  maxStackSize?: number; // Default: 99 if stackable is true
  weight: number; // For inventory weight capacity checks
  icon?: string;
}

// --- Runtime Inventory State ---
export interface ItemInstance {
  instanceId: string; // Unique runtime ID for tracking individual instances
  definitionId: string; // Reference to ItemDefinition.id
  quantity: number;
}

export interface InventoryState {
  items: ItemInstance[];
  maxWeight: number;
}

// Enemies
// GameTypes.ts

export interface EnemyDefinition {
  id: string;
  name: string;
  spriteUrl: string; // Asset path for rendering
  health: number;
  attack: number;
  defense: number;
  detectionRadius: number; // Distance in tiles to trigger alert/encounter
}
