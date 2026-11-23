import * as ex from "excalibur";
import { SaveManager } from "../Lib/Managers/SaveLoadManager";

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export const GAME_TITLE = "Into the Unknown";

export interface TitleSceneOptions {
  /** SaveManager instance. If no valid saves exist, "Load Game" is disabled. */
  saves: SaveManager;
  version?: string;
}

/** Decoupled communication: listen to these from your game/scene manager. */
export interface TitleEventMap {
  newGame: Record<string, never>;
  loadGame: { slotId: string };
}
export const titleEvents = new ex.EventEmitter<TitleEventMap>();

/* -------------------------------------------------------------------------- */
/*  Style constants                                                           */
/* -------------------------------------------------------------------------- */

const COLORS = {
  bgTop: "#05060f",
  bgBottom: "#121a33",
  gold: "#e8c872",
  goldDim: "#9c8446",
  panel: "#0b1022",
  panelBorder: "#3a4670",
  text: "#e9ecf7",
  textDisabled: "#59607a",
  btnTop: "#1d2750",
  btnBottom: "#121a38",
  btnHoverTop: "#2c3b78",
  btnHoverBottom: "#1a2552",
  btnPressTop: "#10173a",
  btnPressBottom: "#0a0f26",
  btnDisabledTop: "#141829",
  btnDisabledBottom: "#0e111d",
} as const;

const BUTTON_STATE = {
  normal: "normal",
  hover: "hover",
  pressed: "pressed",
  disabled: "disabled",
} as const;
type ButtonState = (typeof BUTTON_STATE)[keyof typeof BUTTON_STATE];

const MENU_MODE = { main: "main", load: "load" } as const;
type MenuMode = (typeof MENU_MODE)[keyof typeof MENU_MODE];

const FONT = "Georgia, 'Times New Roman', serif";

/** ScreenElements default to a top-left anchor; every element here is positioned by its center. */
const CENTER = ex.vec(0.5, 0.5);

const Z = { bg: 0, stars: 1, title: 5, button: 6, dim: 20, panel: 21, modal: 22 } as const;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Seeded RNG so the starfield is identical every launch. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number) {
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* -------------------------------------------------------------------------- */
/*  Custom graphics (draw once to an offscreen canvas, then blit)             */
/* -------------------------------------------------------------------------- */

function makeBackgroundGraphic(w: number, h: number): ex.Canvas {
  return new ex.Canvas({
    width: w,
    height: h,
    cache: true,
    draw: ctx => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, COLORS.bgTop);
      g.addColorStop(1, COLORS.bgBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // soft horizon glow
      const glow = ctx.createRadialGradient(w / 2, h * 1.05, 10, w / 2, h * 1.05, h * 0.8);
      glow.addColorStop(0, "rgba(232,200,114,0.22)");
      glow.addColorStop(1, "rgba(232,200,114,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // vignette
      const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  });
}

function makeStarsGraphic(w: number, h: number, count: number, seed: number, maxRadius: number): ex.Canvas {
  return new ex.Canvas({
    width: w,
    height: h,
    cache: true,
    draw: ctx => {
      const rand = mulberry32(seed);
      for (let i = 0; i < count; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 0.4 + rand() * maxRadius;
        const a = 0.35 + rand() * 0.65;
        ctx.fillStyle = `rgba(233,236,247,${a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  });
}

function makeTitleGraphic(text: string, w: number, h: number): ex.Canvas {
  return new ex.Canvas({
    width: w,
    height: h,
    cache: true,
    draw: ctx => {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 56px ${FONT}`;
      setLetterSpacing(ctx, 5);

      const g = ctx.createLinearGradient(0, h * 0.25, 0, h * 0.75);
      g.addColorStop(0, "#fff6d6");
      g.addColorStop(0.5, COLORS.gold);
      g.addColorStop(1, COLORS.goldDim);

      ctx.shadowColor = "rgba(232,200,114,0.55)";
      ctx.shadowBlur = 20;
      ctx.fillStyle = g;
      ctx.fillText(text.toUpperCase(), w / 2, h / 2 - 8);

      // thin ornamental rule under the title
      ctx.shadowBlur = 0;
      const ruleY = h - 20;
      const rg = ctx.createLinearGradient(w * 0.2, 0, w * 0.8, 0);
      rg.addColorStop(0, "rgba(232,200,114,0)");
      rg.addColorStop(0.5, "rgba(232,200,114,0.9)");
      rg.addColorStop(1, "rgba(232,200,114,0)");
      ctx.strokeStyle = rg;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.2, ruleY);
      ctx.lineTo(w * 0.8, ruleY);
      ctx.stroke();

      ctx.fillStyle = COLORS.gold;
      ctx.save();
      ctx.translate(w / 2, ruleY);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    },
  });
}

function makeButtonGraphic(label: string, state: ButtonState, w: number, h: number): ex.Canvas {
  return new ex.Canvas({
    width: w,
    height: h,
    cache: true,
    draw: ctx => {
      const tops = {
        normal: COLORS.btnTop,
        hover: COLORS.btnHoverTop,
        pressed: COLORS.btnPressTop,
        disabled: COLORS.btnDisabledTop,
      };
      const bottoms = {
        normal: COLORS.btnBottom,
        hover: COLORS.btnHoverBottom,
        pressed: COLORS.btnPressBottom,
        disabled: COLORS.btnDisabledBottom,
      };

      const pad = 6;
      ctx.save();
      if (state === BUTTON_STATE.hover) {
        ctx.shadowColor = "rgba(232,200,114,0.55)";
        ctx.shadowBlur = 14;
      }
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, tops[state]);
      g.addColorStop(1, bottoms[state]);
      ctx.fillStyle = g;
      roundedRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 10);
      ctx.fill();
      ctx.restore();

      ctx.lineWidth = state === BUTTON_STATE.hover ? 2.5 : 1.5;
      ctx.strokeStyle =
        state === BUTTON_STATE.disabled ? COLORS.panelBorder + "66" : state === BUTTON_STATE.hover ? COLORS.gold : COLORS.panelBorder;
      roundedRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 10);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const maxTextWidth = w - pad * 2 - 28;
      let fontSize = Math.min(24, h * 0.4);
      setLetterSpacing(ctx, 2);
      ctx.font = `600 ${fontSize}px ${FONT}`;

      const upperLabel = label.toUpperCase();
      while (ctx.measureText(upperLabel).width > maxTextWidth && fontSize > 13) {
        fontSize -= 1;
        setLetterSpacing(ctx, fontSize < 18 ? 1 : 2);
        ctx.font = `600 ${fontSize}px ${FONT}`;
      }

      ctx.fillStyle = state === BUTTON_STATE.disabled ? COLORS.textDisabled : state === BUTTON_STATE.hover ? "#fff6d6" : COLORS.text;
      ctx.fillText(upperLabel, w / 2, h / 2 + (state === BUTTON_STATE.pressed ? 2 : 0));
    },
  });
}

function makePanelGraphic(w: number, h: number): ex.Canvas {
  return new ex.Canvas({
    width: w,
    height: h,
    cache: true,
    draw: ctx => {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 30;
      ctx.fillStyle = COLORS.panel;
      roundedRectPath(ctx, 20, 20, w - 40, h - 40, 16);
      ctx.fill();
      ctx.restore();

      ctx.lineWidth = 2;
      ctx.strokeStyle = COLORS.panelBorder;
      roundedRectPath(ctx, 20, 20, w - 40, h - 40, 16);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.strokeStyle = COLORS.goldDim + "88";
      roundedRectPath(ctx, 28, 28, w - 56, h - 56, 12);
      ctx.stroke();
    },
  });
}

function makeFillGraphic(w: number, h: number, color: string): ex.Canvas {
  return new ex.Canvas({
    width: w,
    height: h,
    cache: true,
    draw: ctx => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
    },
  });
}

function makeTextGraphic(
  text: string,
  size: number,
  color: string,
  w: number,
  h: number,
  align: CanvasTextAlign = "center",
): ex.Canvas {
  return new ex.Canvas({
    width: w,
    height: h,
    cache: true,
    draw: ctx => {
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      ctx.font = `${size}px ${FONT}`;
      ctx.fillStyle = color;
      const x = align === "left" ? 0 : align === "right" ? w : w / 2;
      ctx.fillText(text, x, h / 2);
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  MenuButton (ScreenElement)                                                */
/* -------------------------------------------------------------------------- */

interface MenuButtonOptions {
  label: string;
  width: number;
  height: number;
  enabled?: boolean;
  z?: number;
  onActivate: () => void;
}

class MenuButton extends ex.ScreenElement {
  public enabled: boolean;
  public interactive = true;

  private hovered = false;
  private focused = false;
  private pressed = false;
  private readonly graphicsByState = new Map<ButtonState, ex.Canvas>();

  constructor(private readonly opts: MenuButtonOptions) {
    super({ width: opts.width, height: opts.height, z: opts.z ?? Z.button, anchor: CENTER });
    this.enabled = opts.enabled ?? true;
  }

  onInitialize(engine: ex.Engine) {
    for (const state of Object.values(BUTTON_STATE)) {
      const g = makeButtonGraphic(this.opts.label, state, this.opts.width, this.opts.height);
      this.graphicsByState.set(state, g);
      this.graphics.add(state, g);
    }
    this.refresh();

    this.on("pointerenter", () => {
      if (!this.canInteract()) return;
      this.hovered = true;
      engine.canvas.style.cursor = "pointer";
      this.refresh();
    });
    this.on("pointerleave", () => {
      this.hovered = false;
      this.pressed = false;
      engine.canvas.style.cursor = "default";
      this.refresh();
    });
    this.on("pointerdown", () => {
      if (!this.canInteract()) return;
      this.pressed = true;
      this.refresh();
    });
    this.on("pointerup", () => {
      const wasPressed = this.pressed;
      this.pressed = false;
      this.refresh();
      if (wasPressed && this.canInteract()) this.activate();
    });
  }

  public activate() {
    if (this.canInteract()) this.opts.onActivate();
  }

  public setFocused(focused: boolean) {
    this.focused = focused;
    this.refresh();
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.refresh();
  }

  public setInteractive(interactive: boolean) {
    this.interactive = interactive;
    if (!interactive) {
      this.hovered = false;
      this.pressed = false;
    }
    this.refresh();
  }

  private canInteract() {
    return this.enabled && this.interactive;
  }

  private refresh() {
    let state: ButtonState = BUTTON_STATE.normal;
    if (!this.enabled) state = BUTTON_STATE.disabled;
    else if (this.pressed) state = BUTTON_STATE.pressed;
    else if (this.hovered || this.focused) state = BUTTON_STATE.hover;
    this.graphics.use(state);
  }
}

/* -------------------------------------------------------------------------- */
/*  Twinkling star layer                                                      */
/* -------------------------------------------------------------------------- */

class TwinkleLayer extends ex.ScreenElement {
  private t = 0;
  constructor(
    private readonly gfx: ex.Canvas,
    private readonly speed: number,
    private readonly phase: number,
  ) {
    super({ width: gfx.width, height: gfx.height, z: Z.stars, anchor: CENTER });
  }
  onInitialize() {
    this.graphics.use(this.gfx);
  }
  onPreUpdate(_engine: ex.Engine, elapsed: number) {
    this.t += elapsed / 1000;
    this.graphics.opacity = 0.55 + 0.45 * Math.sin(this.t * this.speed + this.phase);
  }
}

/* -------------------------------------------------------------------------- */
/*  TitleScene                                                                */
/* -------------------------------------------------------------------------- */

export class TitleScene extends ex.Scene {
  private saves: SaveManager;
  private readonly version: string;

  private mode: MenuMode = MENU_MODE.main;
  private focusIndex = 0;
  private pendingDeleteSlot: string | null = null;

  private bg!: ex.ScreenElement;
  private starLayers: TwinkleLayer[] = [];
  private titleEl!: ex.ScreenElement;
  private versionEl!: ex.ScreenElement;
  private hintEl!: ex.ScreenElement;

  private mainButtons: MenuButton[] = [];
  private modalElements: ex.ScreenElement[] = [];
  private modalButtons: MenuButton[] = [];

  private keyHandler?: (evt: ex.KeyEvent) => void;
  private resizeHandler?: () => void;

  constructor(options: TitleSceneOptions) {
    super();
    this.saves = options.saves;
    this.version = options.version ?? "v0.1.0";
  }

  /** Call this if saves change while the title screen is alive. */
  public setSaves(saves: SaveManager) {
    this.saves = saves;
    this.mainButtons[1]?.setEnabled(saves.list().length > 0);
  }

  /* ----------------------------- lifecycle ------------------------------- */

  onInitialize(engine: ex.Engine) {
    // Background + stars (oversized so it covers any aspect ratio)
    this.bg = new ex.ScreenElement({ width: 1920, height: 1080, z: Z.bg, anchor: CENTER });
    this.bg.graphics.use(makeBackgroundGraphic(1920, 1080));
    this.add(this.bg);

    const farStars = new TwinkleLayer(makeStarsGraphic(1920, 1080, 220, 1337, 0.9), 0.8, 0);
    const nearStars = new TwinkleLayer(makeStarsGraphic(1920, 1080, 70, 7331, 1.8), 1.3, 2.1);
    this.starLayers = [farStars, nearStars];
    this.starLayers.forEach(s => this.add(s));

    // Title
    this.titleEl = new ex.ScreenElement({ width: 900, height: 150, z: Z.title, anchor: CENTER });
    this.titleEl.graphics.use(makeTitleGraphic(GAME_TITLE, 900, 150));
    this.add(this.titleEl);

    // Main menu buttons
    const bw = 280;
    const bh = 52;
    const newGame = new MenuButton({
      label: "New Game",
      width: bw,
      height: bh,
      onActivate: () => titleEvents.emit("newGame", {}),
    });

    const loadGame = new MenuButton({
      label: "Load Game",
      width: bw,
      height: bh,
      enabled: this.saves.list().length > 0,
      onActivate: () => this.openLoadModal(),
    });
    this.mainButtons = [newGame, loadGame];
    this.mainButtons.forEach(b => this.add(b));

    // Footer
    this.versionEl = new ex.ScreenElement({ width: 200, height: 30, z: Z.title, anchor: CENTER });
    this.versionEl.graphics.use(makeTextGraphic(this.version, 16, COLORS.textDisabled, 200, 30, "right"));
    this.add(this.versionEl);

    this.hintEl = new ex.ScreenElement({ width: 600, height: 30, z: Z.title, anchor: CENTER });
    this.hintEl.graphics.use(
      makeTextGraphic("↑ ↓ to select  ·  Enter to confirm  ·  Esc to go back", 16, COLORS.textDisabled, 600, 30),
    );
    this.add(this.hintEl);

    this.layout();
    this.resizeHandler = () => this.layout();
    engine.screen.events.on("resize", this.resizeHandler);
  }

  onActivate() {
    const engine = this.engine;
    this.mode = MENU_MODE.main;
    this.pendingDeleteSlot = null;
    this.setSaves(this.saves);
    this.focusIndex = this.firstEnabledIndex(this.mainButtons);
    this.applyFocus();
    this.playIntro();

    this.keyHandler = (evt: ex.KeyEvent) => this.onKey(String(evt.key));
    engine.input.keyboard.on("press", this.keyHandler);
  }

  onDeactivate() {
    if (this.keyHandler) this.engine.input.keyboard.off("press", this.keyHandler);
    this.closeLoadModal();
    this.engine.canvas.style.cursor = "default";
  }

  /* ------------------------------ layout --------------------------------- */

  private layout() {
    const w = this.engine.screen.drawWidth;
    const h = this.engine.screen.drawHeight;
    const cx = w / 2;

    this.bg.pos = ex.vec(cx, h / 2);
    this.starLayers.forEach(s => (s.pos = ex.vec(cx, h / 2)));

    this.titleEl.pos = ex.vec(cx, h * 0.26);

    const startY = h * 0.56;
    const gap = 68;
    this.mainButtons.forEach((b, i) => (b.pos = ex.vec(cx, startY + i * gap)));

    this.versionEl.pos = ex.vec(w - 110, h - 26);
    this.hintEl.pos = ex.vec(cx, h - 26);

    this.layoutModal();
  }

  private playIntro() {
    const fadeIn = (el: ex.Actor, delay: number, duration = 500) => {
      el.graphics.opacity = 0;
      el.actions.clearActions();
      el.actions.delay(delay).fade(1, duration);
    };
    fadeIn(this.titleEl, 150, 900);
    this.mainButtons.forEach((b, i) => fadeIn(b, 700 + i * 150));
    fadeIn(this.hintEl, 1200);
    fadeIn(this.versionEl, 1200);
  }

  /* --------------------------- load modal -------------------------------- */

  private modalDim?: ex.ScreenElement;
  private modalPanel?: ex.ScreenElement;
  private modalHeader?: ex.ScreenElement;

  private openLoadModal() {
    if (this.mode === MENU_MODE.load) return;
    this.mode = MENU_MODE.load;
    this.pendingDeleteSlot = null;
    this.mainButtons.forEach(b => b.setInteractive(false));
    this.engine.canvas.style.cursor = "default";

    this.buildLoadModal();
    this.focusIndex = 0;
    this.applyFocus();
  }

  private buildLoadModal() {
    this.modalElements.forEach(e => e.kill());
    this.modalElements = [];
    this.modalButtons = [];

    const slots = this.saves.list().slice(0, 4);
    const slotCount = slots.length;
    const panelW = 680;
    const panelH = 200 + slotCount * 64;

    const dim = new ex.ScreenElement({ width: 1920, height: 1080, z: Z.dim, anchor: CENTER });
    dim.graphics.use(makeFillGraphic(1920, 1080, "rgba(3,5,12,0.72)"));
    dim.on("pointerdown", () => {});

    const panel = new ex.ScreenElement({ width: panelW, height: panelH, z: Z.panel, anchor: CENTER });
    panel.graphics.use(makePanelGraphic(panelW, panelH));

    const header = new ex.ScreenElement({ width: 500, height: 50, z: Z.modal, anchor: CENTER });
    header.graphics.use(makeTextGraphic("LOAD GAME", 26, COLORS.gold, 500, 50));

    this.modalDim = dim;
    this.modalPanel = panel;
    this.modalHeader = header;

    slots.forEach((entry, rowIndex) => {
      const timeStr = new Date(entry.savedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const scenePart = entry.sceneKey ? ` · ${entry.sceneKey}` : "";
      const label = `${entry.playerName} Lv.${entry.playerLevel}${scenePart} · ${timeStr}`;

      const loadBtn = new MenuButton({
        label,
        width: 430,
        height: 52,
        z: Z.modal,
        onActivate: () => {
          this.pendingDeleteSlot = null;
          titleEvents.emit("loadGame", { slotId: entry.slot });
        },
      });

      const isConfirming = this.pendingDeleteSlot === entry.slot;
      const delBtn = new MenuButton({
        label: isConfirming ? "Sure?" : "Del",
        width: 96,
        height: 52,
        z: Z.modal,
        onActivate: () => {
          if (this.pendingDeleteSlot !== entry.slot) {
            this.pendingDeleteSlot = entry.slot;
            const prevFocus = this.focusIndex;
            this.buildLoadModal();
            this.focusIndex = Math.min(prevFocus, this.modalButtons.length - 1);
            this.applyFocus();
            return;
          }

          this.pendingDeleteSlot = null;
          this.saves.delete(entry.slot);
          this.setSaves(this.saves);

          if (this.saves.list().length === 0) {
            this.closeLoadModal();
          } else {
            this.buildLoadModal();
            this.focusIndex = Math.min(rowIndex * 2, this.modalButtons.length - 1);
            this.applyFocus();
          }
        },
      });

      this.modalButtons.push(loadBtn, delBtn);
    });

    const back = new MenuButton({
      label: "Back",
      width: 200,
      height: 46,
      z: Z.modal,
      onActivate: () => {
        this.pendingDeleteSlot = null;
        this.closeLoadModal();
      },
    });
    this.modalButtons.push(back);

    this.modalElements = [dim, panel, header, ...this.modalButtons];
    this.modalElements.forEach(e => this.add(e));
    this.layoutModal();
  }

  private layoutModal() {
    if (!this.modalPanel) return;
    const w = this.engine.screen.drawWidth;
    const h = this.engine.screen.drawHeight;
    const cx = w / 2;
    const cy = h / 2;
    const panelH = this.modalPanel.height;
    const top = cy - panelH / 2;

    this.modalDim!.pos = ex.vec(cx, cy);
    this.modalPanel.pos = ex.vec(cx, cy);
    this.modalHeader!.pos = ex.vec(cx, top + 70);

    const slotPairsCount = Math.floor((this.modalButtons.length - 1) / 2);
    for (let i = 0; i < slotPairsCount; i++) {
      const y = top + 125 + i * 64;
      const loadBtn = this.modalButtons[i * 2];
      const delBtn = this.modalButtons[i * 2 + 1];
      loadBtn.pos = ex.vec(cx - 58, y);
      delBtn.pos = ex.vec(cx + 216, y);
    }

    const back = this.modalButtons[this.modalButtons.length - 1];
    back.pos = ex.vec(cx, top + 125 + slotPairsCount * 64);
  }

  private closeLoadModal() {
    if (this.mode !== MENU_MODE.load && this.modalElements.length === 0) return;
    this.modalElements.forEach(e => e.kill());
    this.modalElements = [];
    this.modalButtons = [];
    this.modalDim = this.modalPanel = this.modalHeader = undefined;
    this.pendingDeleteSlot = null;

    this.mode = MENU_MODE.main;
    this.mainButtons.forEach(b => b.setInteractive(true));
    this.focusIndex = this.mainButtons[1]?.enabled ? 1 : 0;
    this.applyFocus();
  }

  /* ----------------------- keyboard / focus ------------------------------ */

  private get activeButtons(): MenuButton[] {
    return this.mode === MENU_MODE.main ? this.mainButtons : this.modalButtons;
  }

  private firstEnabledIndex(buttons: MenuButton[]) {
    const i = buttons.findIndex(b => b.enabled);
    return i === -1 ? 0 : i;
  }

  private move(dir: 1 | -1) {
    const list = this.activeButtons;
    if (!list.some(b => b.enabled)) return;
    let i = this.focusIndex;
    do {
      i = (i + dir + list.length) % list.length;
    } while (!list[i].enabled);
    this.focusIndex = i;
    this.applyFocus();
  }

  private applyFocus() {
    this.mainButtons.forEach(b => b.setFocused(false));
    this.modalButtons.forEach(b => b.setFocused(false));
    this.activeButtons[this.focusIndex]?.setFocused(true);
  }

  private onKey(key: string) {
    switch (key) {
      case "ArrowUp":
      case "KeyW":
        this.move(-1);
        break;
      case "ArrowDown":
      case "KeyS":
        this.move(1);
        break;
      case "Enter":
      case "Space":
        this.activeButtons[this.focusIndex]?.activate();
        break;
      case "Escape":
        if (this.mode === MENU_MODE.load) this.closeLoadModal();
        break;
    }
  }
}
