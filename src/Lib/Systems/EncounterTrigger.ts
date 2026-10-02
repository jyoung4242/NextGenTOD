// Systems/EncounterTrigger.ts
import { StateStore } from "../../GameState";
import { GameState } from "../../GameTypes";

export class EncounterTriggerSystem {
  constructor(private readonly store: StateStore<GameState>) {}

  public checkAndTriggerEncounter(triggeredEnemyInstanceId: string): boolean {
    const state = this.store.get();
    if (state.game.mode === "encounter") return false;

    const enemy = state.dungeon?.enemies?.[triggeredEnemyInstanceId];

    if (!enemy || !enemy.alive) return false; // Uses enemy.alive from GameTypes

    const px = Math.floor(state.player.position.x);
    const py = Math.floor(state.player.position.y);

    // 7x7 arena bounds centered on player
    const arenaBounds = {
      minX: Math.max(0, px - 3),
      maxX: px + 3,
      minY: Math.max(0, py - 3),
      maxY: py + 3,
    };

    this.store.batch(ctx => {
      ctx.set("game.mode", "encounter");
      ctx.set("game.encounter", {
        activeEnemyInstanceId: triggeredEnemyInstanceId,
        currentTurn: "player",
        turnCount: 1,
        arenaBounds,
        combatLog: [`Encounter initiated with enemy (${enemy.definitionId})!`],
        isResolved: false,
      });
    });

    return true;
  }
}
// random comment
