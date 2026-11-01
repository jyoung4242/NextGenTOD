// UI/PauseMenu/Tabs/QuestsFormTab.ts
import { Label, vec, Color } from "excalibur";
import { TabElement } from "./tabelement";
import { StateStore } from "../../GameState";
import { GameState, QuestProgress } from "../../GameTypes";

export class QuestsFormTab extends TabElement {
  public tabid = "quests";
  public title = "Quests";
  private questListLabel: Label;
  private unsubscribe?: () => void;

  constructor(private readonly store: StateStore<GameState>) {
    super();

    const titleLabel = new Label({
      text: "=== QUEST JOURNAL ===",
      pos: vec(0, 0),
      color: Color.fromRGB(241, 245, 249),
    });

    this.questListLabel = new Label({
      text: "",
      pos: vec(0, 30),
      color: Color.fromRGB(234, 179, 8), // Gold accent for quests
    });

    this.addChild(titleLabel);
    this.addChild(this.questListLabel);

    // Initial population
    this.updateQuestText();
  }

  public onOpen(): void {
    this.updateQuestText();

    // Subscribe to live state changes on quests
    if (!this.unsubscribe) {
      this.unsubscribe = this.store.subscribe("quests", () => {
        this.updateQuestText();
      });
    }
  }

  public onClose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  private updateQuestText(): void {
    const questsState = this.store.get("quests");
    const activeQuests = (questsState?.active ?? {}) as Record<string, QuestProgress>;
    const completedQuests = questsState?.completed ?? [];

    const textLines: string[] = [];

    // --- 1. Active Quests Section ---
    textLines.push("• ACTIVE QUESTS:");
    const activeEntries = Object.entries(activeQuests);

    if (activeEntries.length === 0) {
      textLines.push("  (None)");
    } else {
      for (const [questId, progress] of activeEntries) {
        textLines.push(`  - [Active] ${progress.questId}`);
        if (progress.objectives && progress.objectives.length > 0) {
          for (const obj of progress.objectives) {
            const statusText = obj.complete ? "Completed" : `${obj.current}/${obj.target}`;
            textLines.push(`    • ${obj.id}: ${statusText}`);
          }
        }
      }
    }

    textLines.push(""); // Spacing

    // --- 2. Completed Quests Section ---
    textLines.push("• COMPLETED QUESTS:");
    if (completedQuests.length === 0) {
      textLines.push("  (None)");
    } else {
      // Show recent completions (e.g., last 5 or all)
      for (const questId of completedQuests) {
        textLines.push(`  ✓ [Completed] ${questId}`);
      }
    }

    this.questListLabel.text = textLines.join("\n").trim();
  }
}
