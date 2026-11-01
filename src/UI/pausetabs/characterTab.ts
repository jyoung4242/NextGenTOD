// UI/PauseMenu/Tabs/CharacterFormTab.ts
import { Label, Actor, vec, Color, ScreenElement } from "excalibur";
import { TabElement } from "./tabelement";
import { SkillDisplayUtility, SkillDisplayModel } from "../../Lib/Systems/SkillDisplayUtility";
import { ContentRegistry } from "../../Content/ContentRegistry";
import { StateStore } from "../../GameState";
import { GameState } from "../../GameTypes";

export class CharacterFormTab extends TabElement {
  public tabid = "character";
  public title = "Character";

  private skillListContainer: Actor;

  constructor(
    private store: StateStore<GameState>,
    private contentRegistry: ContentRegistry,
  ) {
    super();
    this.name = "CharacterTab";
    const titleLabel = new Label({
      text: "=== CHARACTER SKILLS & PROPERTIES ===",
      pos: vec(0, 0),
      color: Color.fromRGB(241, 245, 249),
    });
    this.addChild(titleLabel);

    // Container to hold dynamic skill entries
    this.skillListContainer = new Actor({
      name: "skillListContainer",
      pos: vec(0, 30),
      z: 1000,
      width: 400, // Adjust the width as needed
      height: 300, // Adjust the height as needed
    });

    this.addChild(this.skillListContainer);
  }

  public onOpen(): void {
    // Clear previous skill list items
    this.skillListContainer.removeAllChildren();
    if (!this.store || !this.contentRegistry) return;
    // Fetch UI-ready skill models using our utility
    const skills: SkillDisplayModel[] = SkillDisplayUtility.getPlayerSkillDisplays(this.store.get(), this.contentRegistry);

    let yOffset = 0;
    for (const skill of skills) {
      // Create a text row for each skill (Name, Level, and Progress percentage/bar text)
      const progressText = skill.isMaxLevel
        ? "[ MAX LEVEL ]"
        : `[${skill.currentXp}/${skill.xpNeededForNext} XP] (${skill.progressPercent}%)`;

      const skillRowLabel = new Label({
        text: `${skill.name.padEnd(16, ".")} Lvl ${skill.level.toString().padStart(3, "0")}  ${progressText}`,
        pos: vec(0, yOffset),
        color: skill.isMaxLevel ? Color.fromRGB(250, 204, 21) : Color.fromRGB(148, 163, 184),
      });

      this.skillListContainer.addChild(skillRowLabel);
      yOffset += 24; // Spacing between skill rows
    }
  }
}
