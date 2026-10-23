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

  // Systems/ActionQueueManager.ts
  public enqueuePlayerAction(action: CombatAction, targetEnemyId: string): void {
    // 1. Queue Player Action
    this.queue.push({
      actorId: "player",
      participantType: "player",
      action,
    });

    // 2. Automatically queue counter-actions for ALL living enemies in the encounter
    const currentState = this.stateMachine.getStore().get();
    const encounter = currentState.game.encounter;

    if (encounter && encounter.enemyInstanceIds) {
      const activeDungeonId = currentState.dungeon.current;
      const dungeonEnemies = currentState.dungeon.registry?.[activeDungeonId]?.enemies;

      for (const enemyId of encounter.enemyInstanceIds) {
        const enemyState = dungeonEnemies?.[enemyId];
        // Only queue actions for living enemies
        if (enemyState && enemyState.alive && enemyState.hp > 0) {
          const enemyAction = this.enemyAi.selectAction(enemyId, currentState);
          this.queue.push({
            actorId: enemyId,
            participantType: "enemy",
            action: enemyAction,
          });
        }
      }
    }

    // 3. Process the queue sequentially
    this.processQueue();
  }

  // Systems/ActionQueueManager.ts
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const current = this.queue.shift();
      if (!current) break;

      if (current.participantType === "player") {
        this.stateMachine.processPlayerAction(current.action);
      } else {
        this.stateMachine.processEnemyAction(current.actorId, current.action);
      }

      // ─── ADD THIS: Refresh visual actor positions and grid after every tick ───
      const engine = this.stateMachine.getStore(); // or access your current Scene instance
      // Assuming you can access the current active scene from your Excalibur engine:
      // (If your engine instance is globally accessible or passed into manager)

      // Alternatively, call update on the active scene directly if accessible:
      const activeScene = engine as any; // or hook into your scene reference
      // ...

      // Small delay for smooth pacing
      await new Promise(resolve => setTimeout(resolve, 200));

      const latestState = this.stateMachine.getStore().get();
      if (latestState.game.encounter?.isResolved) {
        this.queue = [];
        break;
      }
    }

    this.isProcessing = false;
  }
}
