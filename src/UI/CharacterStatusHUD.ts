// Graphics/CharacterStatusGraphic.ts
import { Graphic, ExcaliburGraphicsContext, ScreenElement, vec } from "excalibur";
import { StateStore } from "../GameState";
import { GameState } from "../GameTypes";

export class CharacterStatusHUD extends ScreenElement {
  private statusGraphic: CharacterStatusGraphic;

  constructor(private readonly store: StateStore<GameState>) {
    super({
      pos: vec(0, 0),
      anchor: vec(0, 0),

      z: 1000, // Above tactical grid, below floating text
    });

    this.statusGraphic = new CharacterStatusGraphic(() => this.store.get());
    this.graphics.use(this.statusGraphic);
  }

  public override onPreUpdate(): void {
    // Ensures the graphic checks for changes or can be manually flagged dirty
    this.statusGraphic.flagDirty();
  }
}

export class CharacterStatusGraphic extends Graphic {
  private readonly PANEL_WIDTH = 240;
  private readonly PANEL_HEIGHT = 70;
  private readonly PADDING = 20;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDirty: boolean = true;

  // Track previous values to auto-flag dirty when game state changes
  private lastHealth: number = -1;
  private lastMaxHealth: number = -1;
  private lastStamina: number = -1;
  private lastEnemyHealth: number = -1;
  private lastTargetId: string | null = null;

  constructor(private readonly getState: () => GameState) {
    super({
      width: 960,
      height: 540,
    });
    this.canvas = document.createElement("canvas");
    this.canvas.width = 960;
    this.canvas.height = 540;

    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to acquire 2D context for CharacterStatusGraphic");
    }
    this.ctx = context;
  }

  public clone(): CharacterStatusGraphic {
    return new CharacterStatusGraphic(this.getState);
  }

  public flagDirty(): void {
    this.isDirty = true;
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    // 1. Check if live state changed to automatically flag dirty
    this.checkDirtyState();

    // 2. Only redraw offscreen canvas when dirty
    if (this.isDirty) {
      this.redrawHUD();
      this.isDirty = false;
    }

    // 3. Fast blit cached offscreen canvas to Excalibur pipeline
    this.canvas.setAttribute("forceUpload", "true");
    ex.drawImage(this.canvas, x, y, this.width, this.height);
  }

  private checkDirtyState(): void {
    const state = this.getState();
    const player = state.player;
    const encounter = state.game.encounter;

    // Resolve active enemy using game.encounter data and active dungeon registry
    const targetId = encounter?.currentTargetId ?? encounter?.activeEnemyInstanceId ?? null;
    const activeDungeonId = state.dungeon?.current;
    const dungeonState = activeDungeonId ? state.dungeon?.registry?.[activeDungeonId] : undefined;
    const enemy = targetId && dungeonState ? dungeonState.enemies?.[targetId] : null;
    const enemyHp = enemy?.hp ?? 0;

    if (
      player.hp !== this.lastHealth ||
      player.maxHp !== this.lastMaxHealth ||
      player.stamina !== this.lastStamina ||
      enemyHp !== this.lastEnemyHealth ||
      targetId !== this.lastTargetId
    ) {
      this.lastHealth = player.hp;
      this.lastMaxHealth = player.maxHp;
      this.lastStamina = player.stamina;
      this.lastEnemyHealth = enemyHp;
      this.lastTargetId = targetId;
      this.isDirty = true;
    }
  }

  private redrawHUD(): void {
    const state = this.getState();
    const encounter = state.game.encounter;
    if (!encounter) return;

    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // --- 1. RENDER PLAYER HUD (Top-Left) ---
    this.renderPlayerPanel(ctx, state);

    // --- 2. RENDER ENEMY HUD (Top-Right) ---
    const targetId = encounter.currentTargetId ?? encounter.activeEnemyInstanceId;
    const activeDungeonId = state.dungeon?.current;
    const dungeonState = activeDungeonId ? state.dungeon?.registry?.[activeDungeonId] : undefined;

    if (targetId && dungeonState) {
      const enemy = dungeonState.enemies?.[targetId];
      if (enemy && enemy.alive) {
        this.renderEnemyPanel(ctx, enemy, this.canvas.width - this.PANEL_WIDTH - this.PADDING, this.PADDING);
      }
    }
  }

  private renderPlayerPanel(ctx: CanvasRenderingContext2D, state: GameState): void {
    const x = this.PADDING;
    const y = this.PADDING;

    // Background Panel
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

    const player = state.player;
    const hpPercent = Math.max(0, Math.min(1, player.hp / player.maxHp));
    const stamPercent = Math.max(0, Math.min(1, player.stamina / player.maxStamina));

    // Name / Level Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(`Player (HP: ${player.hp}/${player.maxHp})`, x + 12, y + 22);

    // HP Bar Track & Fill
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + 12, y + 32, 216, 10);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(x + 12, y + 32, 216 * hpPercent, 10);

    // Stamina Bar Track & Fill
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + 12, y + 48, 216, 6);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(x + 12, y + 48, 216 * stamPercent, 6);
  }

  private renderEnemyPanel(ctx: CanvasRenderingContext2D, enemy: any, x: number, y: number): void {
    // Background Panel
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

    const maxHp = enemy.maxHp ?? 100;
    const hpPercent = Math.max(0, Math.min(1, enemy.hp / maxHp));

    // Enemy Name Text
    ctx.fillStyle = "#f87171";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(`${(enemy.definitionId ?? "Enemy").toUpperCase()} (HP: ${enemy.hp}/${maxHp})`, x + 12, y + 25);

    // Enemy HP Bar Track & Fill
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + 12, y + 38, 216, 12);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(x + 12, y + 38, 216 * hpPercent, 12);
  }
}
