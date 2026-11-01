// UI/PauseMenu/Tabs/MapFormTab.ts
import { Label, vec, Color } from "excalibur";
import { TabElement } from "./tabelement";

export class MapFormTab extends TabElement {
  public tabid = "map";
  public title = "Map";

  constructor() {
    super();

    const titleLabel = new Label({
      text: "=== DUNGEON FLOOR MAP ===",
      pos: vec(0, 0),
      color: Color.fromRGB(241, 245, 249),
    });

    const mapPlaceholderLabel = new Label({
      text: "[ Region: Dungeon Level 1 ]\n\n[ You are here: Room (4, 2) ]\n[ Discovered Rooms: 12 / 24 ]",
      pos: vec(0, 30),
      color: Color.fromRGB(168, 85, 247), // Purple dungeon accent
    });

    this.addChild(titleLabel);
    this.addChild(mapPlaceholderLabel);
  }

  public onOpen(): void {
    // Update map discovery tracking
  }
}
