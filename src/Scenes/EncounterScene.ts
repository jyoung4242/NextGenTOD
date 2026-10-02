// Scenes/EncounterScene.ts
import { Scene, Actor, Color, vec, Axes, Buttons, Keys } from "excalibur";
import { StateStore } from "../GameState";
import { GameState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";
import { DungeonGridRenderer } from "../UI/DungeonGridRenderer";
import { INPUT_CONTEXT } from "../main";
import { InputMapSystem } from "../Lib/Systems/InputMapper";

export class EncounterScene extends Scene {
  private gridRenderer?: DungeonGridRenderer;
  private readonly TILE_SIZE = 48;

  constructor(
    private readonly store: StateStore<GameState>,
    private readonly contentRegistry: ContentRegistry,
    private readonly inputMapper: InputMapSystem,
  ) {
    super();
  }

  onInitialize(): void {
    this.inputMapper.registerMap({
      name: INPUT_CONTEXT.Encounter,
      inputMap: {
        KeyPresses: new Set([Keys.W, Keys.S, Keys.A, Keys.D, Keys.E]),
        GamepadButtonsTriggers: new Set([Buttons.Face1, Buttons.Face2]),
        GamepadAxesTriggers: new Set([Axes.LeftStickX, Axes.LeftStickY]),
      },
    });
  }

  public onActivate(): void {
    const state = this.store.get();
    const encounter = state.game.encounter;
    if (!encounter) return;

    // 1. Mount centered grid renderer
    this.gridRenderer = new DungeonGridRenderer({
      store: this.store,
      tileSize: this.TILE_SIZE,
    });
    this.add(this.gridRenderer);

    // 2. Spawn actors aligned to centered grid tiles
    this.setupCombatEntities(encounter);
  }

  private setupCombatEntities(encounter: NonNullable<GameState["game"]["encounter"]>): void {
    const state = this.store.get();
    const { minX, maxX, minY, maxY } = encounter.arenaBounds;
    const enemyState = state.dungeon?.enemies?.[encounter.activeEnemyInstanceId];
    const playerPos = state.player?.position;

    // Calculate canvas centering offsets
    const canvasWidth = 960;
    const canvasHeight = 540;
    const gridWidth = (maxX - minX + 1) * this.TILE_SIZE;
    const gridHeight = (maxY - minY + 1) * this.TILE_SIZE;
    const offsetX = (canvasWidth - gridWidth) / 2;
    const offsetY = (canvasHeight - gridHeight) / 2;

    // Helper to calculate pixel position for grid tile (x, y)
    const getTileCenter = (x: number, y: number) => {
      return vec(
        offsetX + (x - minX) * this.TILE_SIZE + this.TILE_SIZE / 2,
        offsetY + (y - minY) * this.TILE_SIZE + this.TILE_SIZE / 2,
      );
    };

    // Spawn Player Token
    if (playerPos) {
      const pTileX = Math.floor(playerPos.x);
      const pTileY = Math.floor(playerPos.y);
      const playerActor = new Actor({
        pos: getTileCenter(pTileX, pTileY),
        radius: this.TILE_SIZE / 3,
        color: Color.fromHex("#3b82f6"),
      });
      this.add(playerActor);
    }

    // Spawn Enemy Token
    if (enemyState && enemyState.alive) {
      const eTileX = Math.floor(enemyState.position.x);
      const eTileY = Math.floor(enemyState.position.y);
      const enemyActor = new Actor({
        pos: getTileCenter(eTileX, eTileY),
        radius: this.TILE_SIZE / 3,
        color: Color.fromHex("#ef4444"),
      });
      this.add(enemyActor);
    }
  }

  public onDeactivate(): void {
    this.clear();
  }
}
