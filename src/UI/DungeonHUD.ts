// Graphics/DungeonStatusGraphic.ts
import { Graphic, ExcaliburGraphicsContext, ScreenElement, vec } from "excalibur";
import { GameState } from "../GameTypes";
import { StateStore } from "../GameState";

export interface DungeonStatusGraphicOptions {
  getState: () => GameState;
  width?: number;
  height?: number;
}

export class CharacterStatusHUD extends ScreenElement {
  private statusGraphic: DungeonStatusGraphic;
  private unsubscribe?: () => void;

  constructor(
    private readonly store: StateStore<GameState>,
    viewportHeight: number = 540,
  ) {
    const hudHeight = 90; // Slightly taller to comfortably fit vertical stacked bars
    super({
      name: "CharacterStatusHUD",
      pos: vec(0, viewportHeight - hudHeight),
      anchor: vec(0, 0),
      z: 10, // Overlay on top of viewport/minimap
      width: 960,
      height: hudHeight,
    });

    this.statusGraphic = new DungeonStatusGraphic({
      getState: () => this.store.get(),
      width: 960,
      height: hudHeight,
    });
    this.graphics.use(this.statusGraphic);
  }

  public override onInitialize(): void {
    this.unsubscribe = this.store.subscribe("player", () => {
      this.statusGraphic.flagDirty();
    });
  }

  public override onRemove(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  public override onPreUpdate(): void {
    this.statusGraphic.flagDirty();
  }
}

export class DungeonStatusGraphic extends Graphic {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDirty: boolean = true;
  private getState: () => GameState;

  // Track previous values to catch changes
  private lastHp: number = -1;
  private lastStamina: number = -1;
  private lastMana: number = -1;
  private lastItemCount: number = -1;
  private lastKeyCount: number = -1;
  private lastFacing: string = "";

  constructor(options: DungeonStatusGraphicOptions) {
    super();
    this.getState = options.getState;
    this.width = options.width ?? 960;
    this.height = options.height ?? 90;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d")!;
  }

  clone(): DungeonStatusGraphic {
    const clone = new DungeonStatusGraphic({
      getState: this.getState,
      width: this.width,
      height: this.height,
    });
    return clone;
  }

  public flagDirty(): void {
    this.isDirty = true;
  }

  public override _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    const state = this.getState();
    const player = state.player;
    const currentItemCount = state.inventory?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
    const currentKeyCount = player.keyring?.length ?? 0;

    if (
      player.hp !== this.lastHp ||
      player.stamina !== this.lastStamina ||
      player.mana !== this.lastMana ||
      currentItemCount !== this.lastItemCount ||
      currentKeyCount !== this.lastKeyCount ||
      player.facing !== this.lastFacing ||
      this.isDirty
    ) {
      this.lastHp = player.hp;
      this.lastStamina = player.stamina;
      this.lastMana = player.mana;
      this.lastItemCount = currentItemCount;
      this.lastKeyCount = currentKeyCount;
      this.lastFacing = player.facing;

      this.renderCanvas();
      this.isDirty = false;

      (this.canvas as any).setAttribute("forceUpload", "true");
    }

    ex.drawImage(this.canvas, x, y);
  }

  private renderCanvas(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const state = this.getState();
    const player = state.player;

    ctx.clearRect(0, 0, w, h);

    // --- 1. HUD BACKGROUND BASE (Metallic Dark Grey) ---
    ctx.fillStyle = "#1e2124";
    ctx.fillRect(0, 0, w, h);

    // Bevel top border
    ctx.fillStyle = "#43484e";
    ctx.fillRect(0, 0, w, 4);
    ctx.fillStyle = "#111315";
    ctx.fillRect(0, 4, w, 2);

    const drawDivider = (xPos: number) => {
      ctx.fillStyle = "#0d0e10";
      ctx.fillRect(xPos, 4, 3, h - 4);
      ctx.fillStyle = "#43484e";
      ctx.fillRect(xPos + 3, 4, 2, h - 4);
    };

    // --- 2. LEFT SECTION: VERTICAL STACKED BARS (HEALTH, STAMINA, MANA) ---
    // We give this section a dedicated column width (e.g., 380px) with vertically stacked bars.
    const colX = 12;
    const colWidth = 370;

    ctx.fillStyle = "#0c0d0e";
    ctx.fillRect(colX, 8, colWidth, h - 16);

    // Helper to render a clean vertical stat row with a progress bar
    const drawVerticalBarRow = (label: string, current: number, max: number, yPos: number, barColor: string) => {
      const percent = Math.max(0, Math.min(1, current / max));

      // Label & Values text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.fillText(label, colX + 10, yPos);
      ctx.textAlign = "right";
      ctx.fillText(`${Math.ceil(current)}/${max}`, colX + colWidth - 10, yPos);

      // Track background
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(colX + 10, yPos + 4, colWidth - 20, 8);

      // Fill bar
      ctx.fillStyle = barColor;
      ctx.fillRect(colX + 10, yPos + 4, (colWidth - 20) * percent, 8);
    };

    drawVerticalBarRow("HEALTH", player.hp, player.maxHp, 22, player.hp / player.maxHp > 0.3 ? "#dc2626" : "#7f1d1d");
    drawVerticalBarRow("STAMINA", player.stamina, player.maxStamina, 45, "#2563eb");
    drawVerticalBarRow("MANA", player.mana ?? 100, player.maxMana ?? 100, 68, "#7c3aed");

    drawDivider(394);

    // --- 3. CENTER: DOOM MUGSHOT ---
    const faceBoxX = w / 2 - 45; // ~435
    ctx.fillStyle = "#0a0b0c";
    ctx.fillRect(faceBoxX, 8, 90, h - 16);

    ctx.strokeStyle = "#33373b";
    ctx.lineWidth = 2;
    ctx.strokeRect(faceBoxX + 1, 9, 88, h - 18);

    const faceCenterX = w / 2;
    const faceCenterY = h / 2 + 2;
    const hpPercent = Math.max(0, Math.min(1, player.hp / player.maxHp));

    if (hpPercent <= 0) {
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.arc(faceCenterX, faceCenterY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillText("X X", faceCenterX, faceCenterY + 6);
    } else {
      ctx.fillStyle = hpPercent < 0.3 ? "#f87171" : "#fde047";
      ctx.beginPath();
      ctx.arc(faceCenterX, faceCenterY, 24, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#000000";
      ctx.fillRect(faceCenterX - 11, faceCenterY - 8, 6, 6);
      ctx.fillRect(faceCenterX + 5, faceCenterY - 8, 6, 6);

      // Mouth expression
      ctx.fillStyle = hpPercent < 0.3 ? "#7f1d1d" : "#000000";
      ctx.fillRect(faceCenterX - 9, faceCenterY + 8, 18, 5);
    }

    drawDivider(faceBoxX - 10);
    drawDivider(faceBoxX + 100);

    // --- 4. RIGHT PANEL: INVENTORY SUMMARY ---
    const rightPanelX = faceBoxX + 110; // ~545
    const rightPanelWidth = 160;
    ctx.fillStyle = "#0c0d0e";
    ctx.fillRect(rightPanelX, 8, rightPanelWidth, h - 16);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText("INVENTORY", rightPanelX + 12, 30);

    const totalItems = state.inventory.items.reduce((sum, item) => sum + item.quantity, 0);
    ctx.font = "bold 18px monospace";
    ctx.fillText(`ITEMS: ${totalItems}`, rightPanelX + 12, 62);

    drawDivider(rightPanelX + rightPanelWidth + 6);

    // --- 5. FAR RIGHT: KEYRING & COMPASS HEADING ---
    const farRightX = rightPanelX + rightPanelWidth + 16;
    const keyringCount = Array.isArray(player.keyring) ? player.keyring.length : 0;
    const dirVal = player.facing;
    const dirString = typeof dirVal === "string" ? dirVal.toUpperCase() : `HDG: ${dirVal}`;

    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`KEYS: [🔑 x${keyringCount}]`, w - 16, 36);

    ctx.fillStyle = "#9ca3af";
    ctx.font = "bold 15px monospace";
    ctx.fillText(`FACING: ${dirString}`, w - 16, 64);
  }
}
