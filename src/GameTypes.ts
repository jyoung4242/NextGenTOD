// GameTypes.ts

import { ContentRegistry } from "./Content/ContentRegistry";

// ******************************
// Game State
// ******************************
//#region gamestate
export type GameMode = "playing" | "encounter" | "paused" | "dead" | "victory" | "game_over" | "playercreation";

export interface GameSessionState {
  mode: GameMode;
  time: number;
  encounter?: EncounterState;
}

export interface GameState {
  game: GameSessionState;
  player: PlayerState;
  inventory: InventoryState;
  dungeon: {
    current: string;
    registry: Record<string, DungeonState>;
  };
  quests: {
    active: Record<string, unknown>;
    completed: string[];
  };
  progression: ProgressionState;
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
  textures: Map<string, HTMLImageElement>;
  contentRegistry?: ContentRegistry;
  getState: () => DungeonState;
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
  itemId?: string;
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

export interface DungeonLightSource {
  x: number;
  y: number;
  radius: number;
  color?: string;
  intensity?: number;
  flicker?: LightFlickerDefinition;
}

export interface DungeonLightingDefinition {
  ambientLight?: number;
  maxLightingDistance?: number;
  lights?: DungeonLightSource[];
}

export interface LightFlickerDefinition {
  enabled: boolean;
  speed?: number;
  intensity?: number;
}

export interface DungeonDefinition {
  id: string;
  defaultFloorTexture?: string;
  defaultCeilingTexture?: string;
  defaultWallTexture?: string;
  wallTextures?: string[]; // Pool of textures for renderer wall variation
  nodes: Record<string, DungeonNodeDefinition>;
  connections: DungeonConnectionDefinition[];
  grid: DungeonGridDefinition;
  items?: DungeonItemPlacement[];
  enemies?: DungeonEnemyPlacement[];
  cutsceneTriggers?: CutsceneTriggerDefinition[];
  lighting?: DungeonLightingDefinition;
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
  skipRaycast?: boolean;
  closedTexture?: string;
  openTexture?: string;
}

export interface DungeonCellDefinition {
  defaultFloorTexture?: string;
  defaultCeilingTexture?: string;
  wallTextures?: string[];
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
  frameCount: number;
  fps: number;
  frameWidth: number;
  frameHeight: number;
}

export interface WallLayer {
  textureKey: string;
  alpha?: number;
  blendMode?: GlobalCompositeOperation;
  scaleX?: number;
  scaleY?: number;
  animation?: LayerAnimationDefinition;
}

export interface WallDefinition {
  type: "wall" | "door" | "none";
  textureKey?: string | string[];
  layers?: WallLayer[];
  doorId?: string;
  closedTexture?: string;
  openTexture?: string;
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
  wallMaterialId?: string;
  wallTextures?: string[];
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
export interface EntityPosition {
  nodeId?: string;
  x: number;
  y: number;
}

export interface PlayerState {
  name: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  mana: number;
  maxMana: number;
  strength: number;
  constitution: number;
  agility: number;
  wisdom: number;
  perception: number;
  position: EntityPosition;
  facing: Direction | number;
  keyring: string[];
  skills: Record<string, SkillState>;
  equipment: EquipmentState;
  spellBook: {
    activeSpellId?: string;
    spells: Record<string, SkillState>;
  };
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
  xpReward?: number;
  lootTableId?: string;
}

export interface EnemyState {
  instanceId?: string;
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
export type EquipmentSlot = "head" | "chest" | "mainHand" | "offHand" | "accessory";

export interface EquipmentState {
  head?: ItemInstance;
  chest?: ItemInstance;
  mainHand?: ItemInstance;
  offHand?: ItemInstance;
  accessory?: ItemInstance;
}

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
  equipmentSlot?: EquipmentSlot;
  requiredSkill?: string;
  minLevel?: number;
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
// Encounter Types
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
  spellId?: string;
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
  currentTargetId?: string;
  currentTurn: TurnParticipant;
  turnCount: number;
  arenaBounds: ArenaBounds;
  playerPosition: TacticalPosition;
  enemyPositions?: Record<string, TacticalPosition>;
  combatLog: string[];
  isResolved: boolean;
  rewards?: {
    xpGained: number;
    itemsDropped: { itemId: string; quantity: number }[];
    leveledUp?: boolean;
    newLevel?: number;
  };
}
//#endregion encountertypes

// ********************************
// Cutscene Types
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
  targetId?: string;
  position?: { x: number; y: number };
  requiredFlags?: string[];
  succeedsFlag?: string;
  playOnce?: boolean;
}
//#endregion cutscenetypes

// ********************************
// Helper Functions
// ********************************
//#region helpers
const cellIndex = new WeakMap<DungeonGridDefinition, Map<number, DungeonCellDefinition>>();

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

  if (Array.isArray(mapped) && mapped.length > 0 && typeof mapped[0] === "object" && "textureKey" in mapped[0]) {
    return { type: "wall", layers: mapped as WallLayer[] };
  }

  if (Array.isArray(mapped)) {
    return {
      type: "wall",
      layers: (mapped as string[]).map((key, index) => ({
        textureKey: key,
        alpha: 1.0,
        blendMode: index > 0 ? "screen" : "source-over",
      })),
    };
  }

  return {
    type: "wall",
    layers: [{ textureKey: mapped as string, alpha: 1.0 }],
  };
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
