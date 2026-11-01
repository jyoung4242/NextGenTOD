// UI/PauseMenu/Tabs/CharacterFormTab.ts
import { Label, vec, Color } from "excalibur";
import { TabElement } from "./tabelement";

export class CharacterFormTab extends TabElement {
  public tabid = "character";
  public title = "Character";

  constructor() {
    super();

    const titleLabel = new Label({
      text: "=== CHARACTER PROPERTIES SHEET ===",
      pos: vec(0, 0),
      color: Color.fromRGB(241, 245, 249),
    });

    const statsLabel = new Label({
      text: "Level: 2\nHP: 45 / 50\nMana: 20 / 20\nAttack Power: 12\nDefense: 5\nExperience: 1,450 / 2,000",
      pos: vec(0, 30),
      color: Color.fromRGB(148, 163, 184),
    });

    this.addChild(titleLabel);
    this.addChild(statsLabel);
  }

  public onOpen(): void {
    // Refresh stats from player state service if needed
  }
}
