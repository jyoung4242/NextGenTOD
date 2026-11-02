// Scenes/CharacterCreationScene.ts
import { Scene, Engine, Label, vec, Color, Keys } from "excalibur";
import { StateStore } from "../GameState";
import { GameState } from "../GameTypes";
import { ContentRegistry } from "../Content/ContentRegistry";
import { InputMapSystem } from "../Lib/Systems/InputMapper";

export class CharacterCreationScene extends Scene {
  private playerName: string = "Hero";
  private attributes = {
    strength: 10,
    constitution: 10,
    agility: 10,
    wisdom: 10,
    perception: 10,
  };

  private readonly MAX_POINT_POOL = 60; // Total points allowed across all stats
  private readonly MIN_STAT = 8;
  private readonly MAX_STAT = 18;

  private nameLabel!: Label;
  private poolLabel!: Label;
  private statsLabel!: Label;
  private instructionLabel!: Label;

  constructor(
    private readonly state: StateStore<GameState>,
    private readonly content: ContentRegistry,
    private readonly inputMapper: InputMapSystem,
  ) {
    super();
  }

  public onInitialize(engine: Engine): void {
    // Title
    const titleLabel = new Label({
      text: "=== CHARACTER CREATION ===",
      pos: vec(280, 50),
      color: Color.fromRGB(250, 204, 21), // Gold accent
    });
    this.add(titleLabel);

    // Character Name Display
    this.nameLabel = new Label({
      text: `Name: ${this.playerName} (Press [N] to change)`,
      pos: vec(280, 110),
      color: Color.White,
    });
    this.add(this.nameLabel);

    // Pool Budget Display
    this.poolLabel = new Label({
      text: this.getPoolText(),
      pos: vec(280, 155),
      color: Color.fromRGB(56, 189, 248), // Cyan accent
    });
    this.add(this.poolLabel);

    // Attributes Display
    this.statsLabel = new Label({
      text: this.getStatsText(),
      pos: vec(280, 205),
      color: Color.fromRGB(148, 163, 184),
    });
    this.add(this.statsLabel);

    // Instructions
    this.instructionLabel = new Label({
      text: "[R] Randomize Roll (Balanced) | [ENTER] Begin Adventure",
      pos: vec(280, 440),
      color: Color.fromRGB(74, 222, 128), // Green accent
    });
    this.add(this.instructionLabel);

    // Keyboard controls
    engine.input.keyboard.on("press", evt => {
      if (engine.currentScene !== this) return;

      if (evt.key === Keys.R) {
        this.rollBalancedAttributes();
      }

      if (evt.key === Keys.N) {
        const inputName = window.prompt("Enter your character's name:", this.playerName);
        if (inputName && inputName.trim().length > 0) {
          this.playerName = inputName.trim();
          this.updateUI();
        }
      }

      if (evt.key === Keys.Enter) {
        this.finalizeAndStart(engine);
      }
    });
  }

  private rollBalancedAttributes(): void {
    const statKeys = ["strength", "constitution", "agility", "wisdom", "perception"] as const;

    // Start everyone at minimum floor
    const current = {
      strength: this.MIN_STAT,
      constitution: this.MIN_STAT,
      agility: this.MIN_STAT,
      wisdom: this.MIN_STAT,
      perception: this.MIN_STAT,
    };

    let remainingPoints = this.MAX_POINT_POOL - this.MIN_STAT * statKeys.length;

    // Safely distribute remaining points randomly without exceeding ceiling limits
    while (remainingPoints > 0) {
      const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)];
      if (current[randomStat] < this.MAX_STAT) {
        current[randomStat] += 1;
        remainingPoints -= 1;
      }
    }

    this.attributes = current;
    this.updateUI();
  }

  private getTotalAssignedPoints(): number {
    return Object.values(this.attributes).reduce((a, b) => a + b, 0);
  }

  private getPoolText(): string {
    const total = this.getTotalAssignedPoints();
    return `Attribute Budget: ${total} / ${this.MAX_POINT_POOL} Points`;
  }

  private getStatsText(): string {
    return (
      `Core Attributes (Range: ${this.MIN_STAT}-${this.MAX_STAT}):\n` +
      `----------------------------------------\n` +
      `Strength:      ${this.attributes.strength}\n` +
      `Constitution:  ${this.attributes.constitution}\n` +
      `Agility:       ${this.attributes.agility}\n` +
      `Wisdom:        ${this.attributes.wisdom}\n` +
      `Perception:    ${this.attributes.perception}`
    );
  }

  private updateUI(): void {
    this.nameLabel.text = `Name: ${this.playerName} (Press [N] to change)`;
    this.poolLabel.text = this.getPoolText();
    this.statsLabel.text = this.getStatsText();
  }

  private finalizeAndStart(engine: Engine): void {
    const total = this.getTotalAssignedPoints();
    if (total > this.MAX_POINT_POOL) {
      alert(`Stat total exceeds the maximum allowed pool of ${this.MAX_POINT_POOL}!`);
      return;
    }

    // Update the global state store with custom values using batching
    this.state.batch(ctx => {
      ctx.set("player.name", this.playerName);

      // Scale health & stamina using rolled Constitution and base values
      const maxHp = 80 + this.attributes.constitution * 2 + this.attributes.strength * 2;
      const maxStamina = 80 + this.attributes.agility * 1 + this.attributes.constitution * 2;

      ctx.set("player.maxHp", maxHp);
      ctx.set("player.hp", maxHp);
      ctx.set("player.maxStamina", maxStamina);
      ctx.set("player.stamina", maxStamina);
      ctx.set("player.mana", 80 + this.attributes.wisdom * 3);
      ctx.set("player.maxMana", 80 + this.attributes.wisdom * 3);

      // Assign rolled core attributes directly to player state
      ctx.set("player.strength", this.attributes.strength);
      ctx.set("player.constitution", this.attributes.constitution);
      ctx.set("player.agility", this.attributes.agility);
      ctx.set("player.wisdom", this.attributes.wisdom);
      ctx.set("player.perception", this.attributes.perception);

      ctx.set("game.mode", "playing");
    });
  }
}
