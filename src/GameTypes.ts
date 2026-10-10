// GameTypes.ts

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
  nodeId?: string; // Optional if position uses continuous grid coordinates
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
  facing: Direction | number;
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
  xp: number;
  unlocked: boolean;
}

export interface ContainerState {
  opened: boolean;
  keyId?: string;
  itemId?: string;
  quantity?: number;
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

// Game Modes & Combat Participants
export type GameMode = "playing" | "encounter" | "paused" | "dead" | "victory" | "game_over";

export type TurnParticipant = "player" | "enemy";

// Tactical Grid & Combat Actions
export interface TacticalPosition {
  x: number;
  y: number;
}

export interface CombatAction {
  type: "attack" | "skill" | "item" | "defend" | "flee" | "throw" | "spell" | "move" | "ranged";
  targetId?: string;
  skillId?: string;
  itemId?: string;
  targetTile?: TacticalPosition;
}

// Combat & Encounter State Types
export interface ArenaBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// GameTypes.ts

export interface EncounterState {
  activeEnemyInstanceId: string;
  enemyInstanceIds?: string[];
  currentTurn: TurnParticipant;
  turnCount: number;
  arenaBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  // Store local tactical positions separately
  playerPosition: { x: number; y: number };
  enemyPositions: Record<string, { x: number; y: number }>;
  combatLog: string[];
  isResolved: boolean;
}

export interface GameSessionState {
  mode: GameMode;
  time: number;
  encounter?: EncounterState;
}

export interface GameState {
  game: GameSessionState;
  player: PlayerState;
  dungeon: DungeonState;
  quests: {
    active: Record<string, QuestProgress>;
    completed: string[];
    flags: Record<string, boolean>; // Global flags toggled by quest triggers
  };
  progression: ProgressionState;
}

// --- Dungeon Types & Interfaces ---

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

export interface DungeonPosition {
  x: number;
  y: number;
}

export interface DungeonEnemyPlacement {
  id: string;
  definitionId: string;
  position: DungeonPosition;
}

export interface DungeonDefinition {
  id: string;
  nodes: Record<string, DungeonNodeDefinition>;
  connections: DungeonConnectionDefinition[];
  grid: DungeonGridDefinition;
  items?: DungeonItemPlacement[];
  enemies?: DungeonEnemyPlacement[];
}

export interface DungeonConnectionDefinition {
  id: string;
  from: string;
  to: string;
  type: "open" | "door" | "stairs" | "locked" | "secret";
  requiredKey?: string;
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

export type WallDefinition = { type: "none" } | { type: "wall"; materialId: string } | { type: "door"; doorId: string };

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

export interface DungeonAsciiOptions {
  wall?: string;
  floor?: string;
  wallMaterialId?: string;
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

  return { width, height, cells };
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
    return { type: "none" };
  }

  return { type: "wall", materialId };
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
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  stackable: boolean;
  maxStackSize?: number;
  weight: number;
  icon?: string;
}

// --- Runtime Inventory State ---
export interface ItemInstance {
  instanceId: string;
  definitionId: string;
  quantity: number;
}

export interface InventoryState {
  items: ItemInstance[];
  maxWeight: number;
}

// Enemies Definition
export interface EnemyDefinition {
  id: string;
  name: string;
  spriteUrl: string;
  health: number;
  attack: number;
  defense: number;
  detectionRadius: number;
  abilities?: string[];
}

// GameTypes.ts

// ─── Quest Static Definitions (Content Registry Data) ────────────────────────

export type ObjectiveType = "talk" | "kill" | "collect" | "reach" | "interact";

export interface QuestObjectiveData {
  id: string;
  description: string;
  type: ObjectiveType;
  /** npcId | enemyId | itemId | regionId | objectId */
  target: string;
  count: number;
}

export interface QuestMetadata {
  title: string;
  description: string;
  faction?: string;
  giverNpc?: string;
}

export interface QuestRewards {
  reputation?: number;
  items?: string[];
  equipment?: string[];
}

export interface QuestTriggerActions {
  setsFlag?: string[];
}

export interface QuestTriggers {
  onStart?: QuestTriggerActions;
  onComplete?: QuestTriggerActions;
}

export interface QuestWorldFlags {
  sets?: string[];
  requires?: string[];
}

export interface QuestDefinitionData {
  id: string;
  metadata: QuestMetadata;
  objectives: QuestObjectiveData[];
  rewards?: QuestRewards;
  triggers?: QuestTriggers;
  worldFlags?: QuestWorldFlags;
}

// ─── Quest Runtime State (GameState Data) ───────────────────────────────────

export interface ObjectiveProgress {
  id: string;
  current: number;
  target: number;
  complete: boolean;
}

export interface QuestProgress {
  questId: string;
  state: "active" | "complete";
  objectives: ObjectiveProgress[];
}

export type QuestState = "not_started" | "active" | "complete";
