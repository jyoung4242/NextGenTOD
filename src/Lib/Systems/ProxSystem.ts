// Systems/ProxSystem.ts
import { StateStore } from "../../GameState";
import { GameState, EnemyState } from "../../GameTypes";
import { ContentRegistry } from "../../Content/ContentRegistry";

export interface DetectionResult {
  alertedEnemies: string[];
  triggeredEncounter?: string;
}

export class ProximitySystem {
  constructor(
    private readonly store: StateStore<GameState>,
    private readonly contentRegistry: ContentRegistry,
  ) {}

  public updateProximity(): DetectionResult {
    const state = this.store.get();

    // 1. Resolve active dungeon ID and runtime state from registry
    const activeDungeonId = state.dungeon.current;
    const activeDungeonState = state.dungeon.registry[activeDungeonId];
    if (!activeDungeonState) return { alertedEnemies: [] };

    const { x: playerX, y: playerY } = state.player.position;
    const enemies = activeDungeonState.enemies ?? {};

    const alertedEnemies: string[] = [];
    let triggeredEncounter: string | undefined = undefined;

    this.store.batch(ctx => {
      const nextEnemies: Record<string, EnemyState> = { ...enemies };
      let hasChanges = false;

      for (const [instanceId, enemy] of Object.entries(enemies)) {
        if (enemy.state === "dead") continue;
        console.log("enemies: ", instanceId);

        const def = this.contentRegistry.getEnemy(enemy.definitionId);
        if (!def) continue;

        const dx = enemy.position.x - playerX;
        const dy = enemy.position.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Immediate tile contact check
        if (distance <= 3.0 && !triggeredEncounter) {
          triggeredEncounter = instanceId;
        }

        // Detection radius alert check
        if (distance <= def.detectionRadius) {
          alertedEnemies.push(instanceId);
          if (enemy.state !== "alert") {
            nextEnemies[instanceId] = { ...enemy, state: "alert" };
            hasChanges = true;
          }
        } else if (enemy.state === "alert") {
          nextEnemies[instanceId] = { ...enemy, state: "idle" };
          hasChanges = true;
        }
      }

      // Safe update using typed path mapped to the active dungeon registry entry
      if (hasChanges) {
        ctx.set(`dungeon.registry.${activeDungeonId}.enemies` as any, nextEnemies);
      }
    });

    return { alertedEnemies, triggeredEncounter };
  }
}
