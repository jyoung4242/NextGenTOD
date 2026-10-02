// Systems/ActionQueueManager.ts
import { CombatAction, TurnParticipant } from "../../GameTypes";

export interface QueuedAction {
  actorId: string;
  participantType: TurnParticipant;
  action: CombatAction;
  speedPriority: number;
}

export class ActionQueueManager {
  private queue: QueuedAction[] = [];
  private isProcessing: boolean = false;

  /**
   * Enqueues the player's chosen action along with a stubbed enemy response action.
   */
  public enqueuePlayerAction(action: CombatAction, enemyId: string): void {
    // 1. Enqueue Player Action
    this.queue.push({
      actorId: "player",
      participantType: "player",
      action,
      speedPriority: 10,
    });

    // 2. Query stubbed Enemy AI and enqueue its counter-action
    const enemyAction = this.getEnemyAIAction(enemyId);
    this.queue.push({
      actorId: enemyId,
      participantType: "enemy",
      action: enemyAction,
      speedPriority: 5,
    });

    // 3. Flush the queue sequentially
    this.processQueue();
  }

  /**
   * Stub method for Enemy AI action decisions.
   * Replace this later with full tactical AI logic (e.g. checking distance, stats, or skill availability).
   */
  public getEnemyAIAction(enemyId: string): CombatAction {
    // Stub implementation: Returns a basic attack action
    return {
      type: "attack",
      targetId: "player",
    };
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const current = this.queue.shift();
      if (!current) break;

      // TODO: Pass 'current.action' to CombatStateMachine or StateStore execution logic here
      console.log(`Processing action for ${current.actorId}:`, current.action);

      // Brief pause between action ticks for visual snappiness
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    this.isProcessing = false;
  }
}
