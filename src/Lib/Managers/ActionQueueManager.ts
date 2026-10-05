// Systems/ActionQueueManager.ts
import { CombatAction, TurnParticipant } from "../../GameTypes";
import { CombatStateMachine } from "../Systems/CombatStateMachine";
import { EnemyAISystem } from "../Systems/EnemyAISystem";
import type { EncounterScene } from "../../Scenes/EncounterScene";

export interface QueuedAction {
  actorId: string;
  participantType: TurnParticipant;
  action: CombatAction;
  speedPriority: number;
}

export class ActionQueueManager {
  private queue: QueuedAction[] = [];
  private isProcessing: boolean = false;
  private readonly enemyAI: EnemyAISystem;

  constructor(
    private readonly stateMachine: CombatStateMachine,
    private readonly scene?: EncounterScene,
  ) {
    this.enemyAI = new EnemyAISystem(this.stateMachine.getContentRegistry());
  }

  public enqueuePlayerAction(action: CombatAction, enemyId: string): void {
    // 1. Enqueue Player Action
    this.queue.push({
      actorId: "player",
      participantType: "player",
      action,
      speedPriority: 10,
    });

    // 2. Enqueue actions for all active, surviving enemies
    const state = this.stateMachine.getStore().get();
    const encounter = state.game.encounter;
    const enemyIds = encounter?.enemyInstanceIds ?? (enemyId ? [enemyId] : []);

    for (const eId of enemyIds) {
      const enemy = state.dungeon?.enemies?.[eId];
      if (enemy && enemy.alive && enemy.hp > 0) {
        const enemyAction = this.enemyAI.selectAction(eId, state);
        this.queue.push({
          actorId: eId,
          participantType: "enemy",
          action: enemyAction,
          speedPriority: 5,
        });
      }
    }

    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const current = this.queue.shift();
      if (!current) break;

      console.log(`[ActionQueue] Executing tick for (${current.participantType} / ${current.actorId}):`, current.action);

      if (current.participantType === "player") {
        this.stateMachine.processPlayerAction(current.action);
      } else {
        this.stateMachine.processEnemyAction(current.actorId, current.action);
      }

      this.scene?.updateActorPositions();

      await new Promise(resolve => setTimeout(resolve, 150));
    }

    this.isProcessing = false;
  }
}
