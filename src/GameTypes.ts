// GameTypes.ts

// ******************************
//Game State
// ******************************
//#region gamestate
export type GameMode = "playing" | "encounter" | "paused" | "dead" | "victory" | "game_over";

export interface GameSessionState {
  mode: GameMode;
  time: number;
  encounter?: EncounterState;
}

// GameTypes.ts

export interface GameState {
  game: {
    mode: string;
    time: number;
    encounter?: EncounterState;
  };
  player: {
    hp: number;
    maxHp: number;
    stamina: number;
    maxStamina: number;
    position: {
      nodeId?: string;
      x: number;
      y: number;
    };
    facing: string;
    keyring: string[];
    skills: Record<string, { level: number; xp: number; unlocked?: boolean }>;
  };
  inventory: InventoryState; // Promoted to top-level property
  dungeon: {
    current: string;
    registry: Record<string, unknown>;
  };
  quests: {
    active: Record<string, unknown>;
    completed: string[];
  };
  progression: {
    experience: number;
    level: number;
    skillPoints: number;
  };
  storypoints?: Record<string, unknown>;
}

//#endregion gamestate

// ********************************
// Dungeon Types
// ********************************
//#region dungeons
export interface DungeonViewportGraphicOptions {
  dungeon: DungeonDefinition;
  camera: DungeonCamera;
  width: number;
  height: number;
}

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

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
// Add these types in GameTypes.ts
export interface DungeonLightSource {
  x: number;
  y: number;
  radius: number;
  color?: string;
  intensity?: number;
  flicker?: LightFlickerDefinition; // 💡 Configured per light source
}

export interface DungeonLightingDefinition {
  ambientLight?: number;
  maxLightingDistance?: number;
  lights?: DungeonLightSource[];
}

export interface LightFlickerDefinition {
  enabled: boolean;
  speed?: number; // How fast it flickers (e.g., 10.0 to 20.0)
  intensity?: number; // How strong the flicker fluctuation is (e.g., 0.05 to 0.15)
}

// Update DungeonDefinition interface:
export interface DungeonDefinition {
  id: string;
  defaultFloorTexture?: string;
  defaultCeilingTexture?: string;
  defaultWallTexture?: string;
  nodes: Record<string, DungeonNodeDefinition>;
  connections: DungeonConnectionDefinition[];
  grid: DungeonGridDefinition;
  items?: DungeonItemPlacement[];
  enemies?: DungeonEnemyPlacement[];
  cutsceneTriggers?: CutsceneTriggerDefinition[];
  lighting?: DungeonLightingDefinition; // 💡 Added here
  onEnterCutsceneId?: string;
  onExitCutsceneId?: string;
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
  defaultFloorTexture?: string; // e.g. "dirt"
  defaultCeilingTexture?: string; // e.g. "ceiling"
  defaultWallTexture?: string; // e.g. "stone"
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

export interface LayerAnimationDefinition {
  frameCount: number; // e.g. 4 frames of torch animation horizontally
  fps: number; // e.g. 8 frames per second
  frameWidth: number; // Pixel width of a single frame in the sprite sheet
  frameHeight: number; // Pixel height of a single frame
}

export interface WallLayer {
  textureKey: string;
  alpha?: number;
  blendMode?: GlobalCompositeOperation;
  scaleX?: number;
  scaleY?: number;
  animation?: LayerAnimationDefinition; // <--- NEW: Animated texture support
}

export interface WallDefinition {
  type: "wall" | "door" | "none";
  textureKey?: string | string[];
  layers?: WallLayer[]; // <--- NEW: Composite layers for custom walls / portals
  doorId?: string;
}

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
  wallMaterialId?: string; // Default wall texture
  tileMap?: Record<string, string | string[] | WallLayer[]>;
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
//#endregion dungeons

// ********************************
// Player Types
// ********************************

//#region playertypes
export interface SkillDefinition {
  id: string;
  name: string;
  category: string;
  staminaCost: number;
  manaCost: number;
  basePower: number;
  targetType: "self" | "single_enemy" | "area";
  range: number;
}

export interface EntityPosition {
  x: number;
  y: number;
}

// GameTypes.ts

export interface PlayerState {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  position: EntityPosition;
  facing: Direction;
  keyring: string[];
  skills: Record<string, SkillState>;
}

export interface SkillState {
  level: number;
  xp: number;
  unlocked: boolean;
}

//#endregion playertypes

// ********************************
// Enemy Types
// ********************************

//#region enemytypes

export interface EnemyDefinition {
  id: string;
  name: string;
  avatarKey: string;
  textureKey?: string;
  tokenKey?: string;
  scale?: number;
  yOffset?: number;
  health: number;
  attack: number;
  defense: number;
  detectionRadius: number;
  abilities?: string[];

  // 🚀 New properties for Progression & Loot
  xpReward?: number;
  lootTableId?: string;
}

export interface EnemyState {
  instanceId?: string; // Optional unique instance tracking if needed
  definitionId: string;
  hp: number;
  maxHp: number;
  nodeId: string;
  alive: boolean;
  position: EntityPosition;
  facing: Direction | number;
  state: "idle" | "alert" | "dead";
}

//#endregion enemytypes

// ********************************
// Item Types
// ********************************

//#region itemtypes
// GameTypes.ts

export type ItemCategory = "consumable" | "equipment" | "material" | "junk" | "key";

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  stackable: boolean;
  maxStackSize?: number;
  weight: number;
  icon?: string;
  textureKey?: string;
}

export interface ItemInstance {
  instanceId: string;
  definitionId: string;
  quantity: number;
}

export interface InventoryState {
  items: ItemInstance[];
  maxWeight: number;
}

export interface ContainerState {
  opened: boolean;
  keyId?: string;
  itemId?: string;
  quantity?: number;
}

//#endregion itemtypes

// ********************************
// Quest Types
// ********************************

//#region questtypes
// --- Quest Content Definitions (Static Data) ---

export type ObjectiveType = "talk" | "kill" | "collect" | "reach" | "interact";

export interface QuestObjectiveData {
  id: string;
  description: string;
  type: ObjectiveType;
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

// --- Quest Runtime State ---

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

//#endregion questtypes

// ********************************
// Progression Types
// ********************************

//#region progressiontypes

export interface ProgressionState {
  experience: number;
  level: number;
  skillPoints: number;
}

//#endregion progressiontypes

// ********************************
// Encounter (Combat) Types
// ********************************

//#region encountertypes

export type TurnParticipant = "player" | "enemy";

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

export interface ArenaBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface EncounterState {
  activeEnemyInstanceId: string;
  enemyInstanceIds?: string[];
  currentTargetId?: string; // 🎯 Added to track active cursor/reticle selection
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
  // Add post-encounter reward tracking if desired:
  rewards?: {
    xpGained: number;
    itemsDropped: { itemId: string; quantity: number }[];
    leveledUp?: boolean;
    newLevel?: number;
  };
}

//#endregion encountertypes

// ********************************
// CuteScene Types
// ********************************

//#region cutscenetypes

export type CutsceneTriggerType =
  | "quest_step"
  | "interaction"
  | "dialogue_choice"
  | "encounter_start"
  | "encounter_victory"
  | "tile_enter";

export interface CutsceneTriggerDefinition {
  id: string;
  cutsceneId: string;
  triggerType: CutsceneTriggerType;

  // Specific payload criteria based on trigger type
  targetId?: string; // Quest ID, Node ID, Item ID, or Enemy ID[cite: 2]
  position?: { x: number; y: number }; // Tile coordinates for dungeon step triggers

  // Gating & Execution Rules
  requiredFlags?: string[]; // Story points that must be true
  succeedsFlag?: string; // Flag set after playing to make it run once
  playOnce?: boolean; // Explicit flag tracking
}

//#endregion cutscenetypes

// ********************************
// UI Types
// ********************************

//#region uiTypes

// UI/ToastTypes.ts
export type ToastCategory = "quest" | "item" | "enemy" | "dungeon" | "progression";

export interface ToastMessage {
  id: string;
  category: ToastCategory;
  title: string;
  message: string;
  duration?: number; // Duration in ms (default: 3500)
}

export interface ActiveToastInstance {
  data: ToastMessage;
  elapsed: number;
  duration: number;
  alpha: number;
  targetY: number;
  currentY: number;
}

//#endregion uiTypes

// ********************************
// Helper Functions
// ********************************

//#region helpers

export function dungeonFromAscii(ascii: string, options: DungeonAsciiOptions = {}): DungeonGridDefinition {
  const wall = options.wall ?? "#";
  const floor = options.floor ?? " ";
  const defaultWallTexture = options.wallMaterialId ?? "stone";
  const tileMap = options.tileMap ?? {};

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
        north: createCustomWall(lines, x, y - 1, width, wall, floor, defaultWallTexture, tileMap),
        east: createCustomWall(lines, x + 1, y, width, wall, floor, defaultWallTexture, tileMap),
        south: createCustomWall(lines, x, y + 1, width, wall, floor, defaultWallTexture, tileMap),
        west: createCustomWall(lines, x - 1, y, width, wall, floor, defaultWallTexture, tileMap),
      });
    }
  }

  return { width, height, cells };
}

function createCustomWall(
  lines: string[],
  x: number,
  y: number,
  width: number,
  wall: string,
  floor: string,
  defaultTexture: string,
  tileMap: Record<string, string | string[] | WallLayer[]>,
): WallDefinition {
  if (x < 0 || y < 0 || y >= lines.length || x >= width) {
    return { type: "wall", layers: [{ textureKey: defaultTexture, alpha: 1.0 }] };
  }

  const char = lines[y][x];

  if (char === floor) {
    return { type: "none" };
  }

  const mapped = tileMap[char];

  if (!mapped) {
    return { type: "wall", layers: [{ textureKey: defaultTexture, alpha: 1.0 }] };
  }

  // Case A: Mapped is an array of explicit WallLayer objects (with animation/blend modes)
  if (Array.isArray(mapped) && mapped.length > 0 && typeof mapped[0] === "object" && "textureKey" in mapped[0]) {
    return { type: "wall", layers: mapped as WallLayer[] };
  }

  // Case B: Mapped is a string array (e.g. ["stone", "torch"])
  if (Array.isArray(mapped)) {
    return {
      type: "wall",
      layers: (mapped as string[]).map((key, index) => ({
        textureKey: key,
        alpha: 1.0,
        blendMode: index > 0 ? "screen" : "source-over", // Automatically screen-blend overlays
      })),
    };
  }

  // Case C: Mapped is a single string
  return {
    type: "wall",
    layers: [{ textureKey: mapped as string, alpha: 1.0 }],
  };
}

function createWall(
  lines: string[],
  x: number,
  y: number,
  width: number,
  wall: string,
  floor: string,
  textureKey: string[],
): WallDefinition {
  if (isFloor(lines, x, y, width, wall, floor)) {
    return { type: "none" };
  }

  return { type: "wall", textureKey };
}

function isFloor(lines: string[], x: number, y: number, width: number, wall: string, floor: string): boolean {
  if (x < 0 || y < 0 || y >= lines.length || x >= width) {
    return false;
  }

  return lines[y][x] === floor;
}

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

export function createDungeonCamera(x: number, y: number): DungeonCamera {
  return {
    x,
    y,
    angle: 0,
    fov: Math.PI / 3,
  };
}

//#endregion helpers
