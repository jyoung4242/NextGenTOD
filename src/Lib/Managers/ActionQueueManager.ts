// Systems/ActionQueueManager.ts
import { CombatAction, TurnParticipant } from "../../GameTypes";
import { CombatStateMachine } from "../Systems/CombatStateMachine";
import { EnemyAISystem } from "../Systems/EnemyAISystem";

export interface QueuedAction {
  actorId: string;
  participantType: TurnParticipant;
  action: CombatAction;
}

export class ActionQueueManager {
  private queue: QueuedAction[] = [];
  private isProcessing: boolean = false;
  private enemyAi: EnemyAISystem;

  constructor(private readonly stateMachine: CombatStateMachine) {
    // Initialize the enemy AI system using the content registry from the state machine
    this.enemyAi = new EnemyAISystem(this.stateMachine.getContentRegistry());
  }

  public enqueuePlayerAction(action: CombatAction, enemyId: string): void {
    // 1. Queue Player Action
    this.queue.push({
      actorId: "player",
      participantType: "player",
      action,
    });

    // 2. Automatically queue the Enemy's counter-action right after
    const currentState = this.stateMachine.getStore().get();
    const enemyAction = this.enemyAi.selectAction(enemyId, currentState);

    this.queue.push({
      actorId: enemyId,
      participantType: "enemy",
      action: enemyAction,
    });

    // 3. Process the queue sequentially
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const current = this.queue.shift();
      if (!current) break;

      if (current.participantType === "player") {
        // Execute player action (which sets currentTurn to 'enemy')
        this.stateMachine.processPlayerAction(current.action);
      } else {
        // Execute enemy action (which sets currentTurn back to 'player')
        this.stateMachine.processEnemyAction(current.actorId, current.action);
      }

      // Small delay for smooth combat pacing and log readability
      await new Promise(resolve => setTimeout(resolve, 200));

      // If the encounter became resolved (e.g. enemy died), clear the rest of the queue
      const latestState = this.stateMachine.getStore().get();
      if (latestState.game.encounter?.isResolved) {
        this.queue = [];
        break;
      }
    }

    this.isProcessing = false;
  }
}
