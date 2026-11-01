// UI/PauseMenu/Tabs/QuestsFormTab.ts
import { Label, vec, Color } from "excalibur";
import { TabElement } from "./tabelement";

export class QuestsFormTab extends TabElement {
  public tabid = "quests";
  public title = "Quests";

  constructor() {
    super();

    const titleLabel = new Label({
      text: "=== ACTIVE QUEST LOG ===",
      pos: vec(0, 0),
      color: Color.fromRGB(241, 245, 249),
    });

    const questListLabel = new Label({
      text: "• [Main] Into the Crypts\n  - Find the rusty iron key (Completed)\n  - Unlock the heavy stone door (Pending)\n\n• [Side] Goblin Menace\n  - Defeat scouts (3/5)",
      pos: vec(0, 30),
      color: Color.fromRGB(234, 179, 8), // Gold accent for quests
    });

    this.addChild(titleLabel);
    this.addChild(questListLabel);
  }

  public onOpen(): void {
    // Sync quest state from QuestManager
  }
}
