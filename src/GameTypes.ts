// GameTypes.ts

import { ImageSource, Sprite } from "excalibur";
import { ContentRegistry } from "./Content/ContentRegistry";
import type { SaveManager } from "./Lib/Managers/SaveLoadManager";

// ******************************
// Game State
// ******************************
//#region gamestate
export type GameMode = "playing" | "encounter" | "paused" | "dead" | "victory" | "game_over" | "playercreation" | "title";

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
    active: Record<string, QuestProgress>;
    completed: string[];
    flags?: Record<string, boolean>;
  };
  progression: ProgressionState;
  storypoints?: Record<string, unknown>;
}
//#endregion gamestate

// ********************************
// Directional Sprite & Prop Types
// ********************************
//#region directionaltypes
export type PropFacing = Direction; // "north" | "east" | "south" | "west"
export type DirectionBucketCount = 4 | 8;

export type SpriteViewDirection4 = "front" | "right" | "back" | "left";
export type SpriteViewDirection8 = "front" | "front_right" | "right" | "back_right" | "back" | "back_left" | "left" | "front_left";
export type SpriteViewDirection = SpriteViewDirection4 | SpriteViewDirection8;

export interface DirectionalSpriteSet {
  /** Base key used for convention lookup, e.g. "farmhouse_bed" -> "farmhouse_bed_front" */
  baseKey: string;
  /** Optional explicit texture key overrides per view bucket */
  variants?: Partial<Record<SpriteViewDirection, string>>;
  /** Mirror horizontally when viewing from the opposite side (e.g. reuse "left" for "right") */
  mirrorHorizontal?: boolean;
  /** Number of angular buckets around the object (default: 4) */
  directions?: DirectionBucketCount;
}

export interface ContainerLootEntry {
  itemId?: string;
  keyId?: string;
  quantity: number;
}

export interface PropContainerDefinition {
  /** Whether the container starts locked */
  locked?: boolean;
  /** Key ID required to unlock (if omitted when locked, can require a skill/flag or stay locked) */
  requiredKeyId?: string;
  /** Items or keys contained in the prop */
  items?: ContainerLootEntry[];
  /** Optional gold amount granted on open */
  gold?: number;
  /** Cutscene ID triggered on interaction (e.g., open, unlock, or inspect) */
  cutsceneId?: string;
  /** Optional story flag set after opening/triggering */
  succeedsFlag?: string;
  /** Optional open/unlocked sprite variant key or override */
  openedTextureKey?: string;
  /** Optional locked sprite variant key or override */
  lockedTextureKey?: string;
}

export interface WorldPropDefinition {
  id: string;
  name: string;
  facing: PropFacing;
  sprite: DirectionalSpriteSet;
  /** Vertical scale relative to wall height (e.g., 0.4 for low furniture like a bed) */
  scale?: number;
  /** Positive values push the sprite lower toward the floor */
  yOffset?: number;
  /** Whether the prop blocks movement/raycasting in its tile */
  blocksMovement?: boolean;
  /** Present when this prop can act as a container */
  container?: PropContainerDefinition;
}

export interface DungeonPropPlacement {
  id: string;
  definitionId: string;
  position: WorldPosition;
  /** Optional per-placement facing override */
  facing?: PropFacing;
  containerOverride?: Partial<PropContainerDefinition>;
}
//#endregion directionaltypes

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

export interface PropRuntimeState {
  locked: boolean;
  opened: boolean;
  looted: boolean;
}

export interface DungeonState {
  definitionId: string;
  seed: number;
  currentNodeId: string;
  discoveredNodes: string[];
  visitedNodes: string[];
  doors: Record<string, DoorState>;
  containers: Record<string, ContainerState>;
  props?: Record<string, PropRuntimeState>;
  enemies: Record<string, EnemyState>;
  npcs: Record<string, NPCDefinition>;
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

export interface FloorOverlay {
  x: number;
  y: number;
  textureKey: string;
  alpha: number;
  offsetX?: number;
  offsetY?: number;
}

export type FloorOverlays = Record<string, FloorOverlay>;

export interface DungeonDefinition {
  id: string;
  defaultFloorTexture?: string;
  defaultCeilingTexture?: string;
  defaultWallTexture?: string;
  wallTextures?: string[]; // Pool of textures for renderer wall variation
  floorOverlays?: FloorOverlays;
  nodes: Record<string, DungeonNodeDefinition>;
  connections: DungeonConnectionDefinition[];
  grid: DungeonGridDefinition;
  items?: DungeonItemPlacement[];
  enemies?: DungeonEnemyPlacement[];
  props?: DungeonPropPlacement[];
  cutsceneTriggers?: CutsceneTriggerDefinition[];
  lighting?: DungeonLightingDefinition;
  onEnterCutsceneId?: string;
  onExitCutsceneId?: string;
  npcs?: NPCDefinition[];
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
    spells: string[];
  };
}
export interface SpellDefinition {
  id: string;
  name: string;
  category: string;
  minLevelRequirement: number;
  targetMode: string;
  manaCost: number;
  basePower: number;
  range: number;
  description: string;
  textureKey?: string;
  bulletTextureKey?: string;
  chargeAnimationKey?: string;
  hitAnimationKey?: string;
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
  directionalSprites?: DirectionalSpriteSet;
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
// Quest Types
// ********************************
//#region questtypes
// --- Quest Content Definitions (Static Data) ---

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
// Skill Types
// ********************************
//#region skilltypes
export type CoreCharacteristic = "hp" | "stam" | "agil" | "per" | "wisdom";
export type SkillCategory = "combat" | "defense" | "armor" | "magic";

export interface SkillDefinition {
  id: string;
  name: string;
  category: SkillCategory;
  supportedCharacteristics: CoreCharacteristic[];
  basePowerMultiplier: number;
}
//#endregion skilltypes

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
// NPC Types
// ********************************
//#region npctypes
export interface NPCDefinition {
  id: string;
  name: string;
  position: { x: number; y: number };
  facing?: Direction | number;
  cutsceneId: string;
  requiredFlag?: string;
  succeedsFlag?: string;
  color?: string;
  textureKey?: string;
  directionalSprites?: DirectionalSpriteSet;
  avatarKey?: string;
  scale?: number;
  yOffset?: number;
}
//#endregion npctypes

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

// export function toTitleSaves(saveManager: SaveManager): TitleSaveSlotInfo[] {
//   return saveManager.list().map(entry => {
//     const dateStr = new Date(entry.savedAt).toLocaleString(undefined, {
//       month: "short",
//       day: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//     });
//     const scenePart = entry.sceneKey ? `${entry.sceneKey} · ` : "";

//     return {
//       id: entry.slot,
//       label: entry.playerName ? `${entry.slot}: ${entry.playerName}` : entry.slot,
//       detail: `Lv.${entry.playerLevel} · ${scenePart}${dateStr}`,
//     };
//   });
// }

export function createDungeonCamera(x: number, y: number): DungeonCamera {
  return {
    x,
    y,
    angle: 0,
    fov: Math.PI / 3,
  };
}
//#endregion helpers

// ********************************
// Cinematic Types
// ********************************
// CinematicTypes.ts

export type PanDirection = "left-to-right" | "right-to-left" | "none";

export interface CinematicSlide {
  id: string;
  image?: ImageSource; // Preloaded ImageSource when authored in TS
  imageKey?: string; // Resource key string when authored in JSON
  sprite?: Sprite | null;
  graphicWidth?: number;
  graphicHeight?: number;
  startX?: number;
  speedPxPerSec?: number;
  pan?: PanDirection;
  bounceAtBounds?: boolean;
  durationSec?: number;
  dialogPath?: string;
  narrativeText?: string;
  caption?: string;
}

export interface CinematicManifest {
  id: string;
  title?: string;
  slides: CinematicSlide[];
  onCompleteSetFlag?: string;
}
