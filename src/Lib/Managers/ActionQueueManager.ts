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

  public enqueuePlayerAction(action: CombatAction, _targetId?: string): void {
    // 1. Enqueue the player action
    this.queue.push({
      actorId: "player",
      participantType: "player",
      action,
      speedPriority: 10,
    });

    // 2. Trigger queue processing
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const current = this.queue.shift();
      if (!current) break;

      console.log(`[ActionQueue] Executing tick for (${current.participantType} / ${current.actorId}):`, current.action);

      // Delegate turn processing to CombatStateMachine
      if (current.participantType === "player") {
        this.stateMachine.processPlayerAction(current.action);
      } else {
        this.stateMachine.processEnemyAction(current.actorId, current.action);
      }

      // Re-align Excalibur actor graphics on screen with StateStore positions
      this.scene?.updateActorPositions();

      // Brief tick delay for visual snappiness
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    this.isProcessing = false;
  }
}
