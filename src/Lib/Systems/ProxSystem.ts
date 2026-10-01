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
    const { x: playerX, y: playerY } = state.player.position;
    const enemies = state.dungeon?.enemies ?? {};

    const alertedEnemies: string[] = [];
    let triggeredEncounter: string | undefined = undefined;

    this.store.batch(ctx => {
      const nextEnemies: Record<string, EnemyState> = { ...enemies };
      let hasChanges = false;

      for (const [instanceId, enemy] of Object.entries(enemies)) {
        if (enemy.state === "dead") continue;

        const def = this.contentRegistry.getEnemy(enemy.definitionId);
        if (!def) continue;

        const dx = enemy.position.x - playerX;
        const dy = enemy.position.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Immediate tile contact check
        if (distance <= 1.0 && !triggeredEncounter) {
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

      // Safe update using typed path
      if (hasChanges) {
        ctx.set("dungeon.enemies", nextEnemies);
      }
    });

    return { alertedEnemies, triggeredEncounter };
  }
}
