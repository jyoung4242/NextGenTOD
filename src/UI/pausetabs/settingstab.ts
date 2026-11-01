// UI/PauseMenu/Tabs/SettingsFormTab.ts
import { Label, vec, Color } from "excalibur";
import { TabElement } from "./tabelement";

export class SettingsFormTab extends TabElement {
  public tabid = "settings";
  public title = "Settings";

  constructor() {
    super();

    const titleLabel = new Label({
      text: "=== GAME SETTINGS ===",
      pos: vec(0, 0),
      color: Color.fromRGB(241, 245, 249),
    });

    const optionsLabel = new Label({
      text: "Master Volume: [ ████████░░ ] 80%\nSFX Volume:    [ ██████████ ] 100%\nMusic Volume:  [ ██████░░░░ ] 60%\n\nCRT Shader:    [ ON ]\nFullscreen:    [ OFF ]",
      pos: vec(0, 30),
      color: Color.fromRGB(56, 189, 248), // Sky blue accent
    });

    this.addChild(titleLabel);
    this.addChild(optionsLabel);
  }
}
