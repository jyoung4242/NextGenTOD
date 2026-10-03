// Systems/ActionQueueManager.ts
import { CombatAction, TurnParticipant } from "../../GameTypes";
import { CombatStateMachine } from "../Systems/CombatStateMachine";
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

  constructor(
    private readonly stateMachine: CombatStateMachine,
    private readonly scene?: EncounterScene,
  ) {}

  public enqueuePlayerAction(action: CombatAction, enemyId: string): void {
    this.queue.push({
      actorId: "player",
      participantType: "player",
      action,
      speedPriority: 10,
    });

    const enemyAction = this.getEnemyAIAction(enemyId);
    this.queue.push({
      actorId: enemyId,
      participantType: "enemy",
      action: enemyAction,
      speedPriority: 5,
    });

    this.processQueue();
  }

  public getEnemyAIAction(enemyId: string): CombatAction {
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

      console.log(`[ActionQueue] Executing tick for (${current.participantType} / ${current.actorId}):`, current.action);

      if (current.participantType === "player") {
        this.stateMachine.processPlayerAction(current.action);
      } else {
        // Handle enemy turn processing
      }

      // Notify scene to re-align Actor positions to StateStore positions
      this.scene?.updateActorPositions();

      await new Promise(resolve => setTimeout(resolve, 150));
    }

    this.isProcessing = false;
  }
}
