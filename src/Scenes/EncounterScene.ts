// Scenes/EncounterScene.ts
import { Scene, Engine } from "excalibur";
import { StateStore } from "../GameState";
import { GameState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";
import { DungeonGridRenderer } from "../UI/DungeonGridRenderer";

export class EncounterScene extends Scene {
  private gridRenderer?: DungeonGridRenderer;

  constructor(
    private readonly store: StateStore<GameState>,
    private readonly contentRegistry: ContentRegistry,
  ) {
    super();
  }

  public onActivate(_context: any): void {
    const state = this.store.get();
    const activeEncounter = state.game.encounter;

    console.log(`[EncounterScene]: Entered combat against ${activeEncounter?.activeEnemyInstanceId}`);

    // 1. Build Top-Down 2D Grid from shared map definition
    this.gridRenderer = new DungeonGridRenderer(this.store);
    this.add(this.gridRenderer);

    // 2. Spawn Player & Enemy combat actors at grid coordinates
    this.setupCombatEntities(activeEncounter?.activeEnemyInstanceId);
  }

  public onDeactivate(): void {
    // Clear actors and graphics when combat ends and returning to dungeon view
    this.clear();
  }

  private setupCombatEntities(enemyInstanceId?: string): void {
    if (!enemyInstanceId) return;

    const enemyState = this.store.get().dungeon.enemies[enemyInstanceId];
    const playerPos = this.store.get().player.position;

    // Spawn 2D Top-down Player Actor at playerPos
    // Spawn 2D Top-down Enemy Actor at enemyState.position
  }
}
