// UI/ToastManager.ts
import { Graphic, ExcaliburGraphicsContext, ScreenElement, vec, Vector } from "excalibur";
import { ToastMessage, ActiveToastInstance, ToastCategory } from "../GameTypes";
import { StateStore } from "../GameState";
import { GameState } from "../GameTypes";

export class ToastManager {
  private unsubscribe: (() => void)[] = [];
  private toastHUD: ToastHUD;

  // Track previous states for granular diffing mutations
  private prevInventoryQuantities: Map<string, number> = new Map();
  private prevLevel: number = 1;
  private prevActiveQuests: Record<string, any> = {};
  private prevKeyringLength: number = 0;

  constructor(
    private readonly getState: () => StateStore<GameState>,
    showInitialQuests: boolean = true,
  ) {
    this.toastHUD = new ToastHUD();
    this.initStoreSubscriptions(showInitialQuests);
  }

  public getHUD(): ToastHUD {
    return this.toastHUD;
  }

  public show(category: ToastCategory, title: string, message: string, duration?: number): void {
    this.toastHUD.show(category, title, message, duration);
  }

  private initStoreSubscriptions(showInitialQuests: boolean): void {
    const store = this.getState();
    const initialState = store.get();
    const activeQuests = initialState.quests?.active ?? {};
    if (showInitialQuests) {
      for (const questKey of Object.keys(activeQuests)) {
        this.show("quest", "Quest Active", `Current: ${questKey}`);
      }
    }

    this.prevLevel = initialState.progression?.level ?? 1;
    this.prevActiveQuests = { ...(initialState.quests?.active ?? {}) };

    // Initialize inventory quantities tracker using instance IDs for granular resolution
    const initialItems = initialState.inventory?.items ?? [];
    for (const item of initialItems) {
      this.prevInventoryQuantities.set(item.instanceId, item.quantity);
    }

    const initialKeyring = initialState.player?.keyring;
    this.prevKeyringLength = initialKeyring instanceof Set ? initialKeyring.size : (initialKeyring?.length ?? 0);

    // 1. Listen to Keyring Changes
    this.unsubscribe.push(
      store.subscribe("player.keyring", payload => {
        const keyring = payload.value;
        const currentLength = keyring instanceof Set ? keyring.size : (keyring?.length ?? 0);

        if (currentLength > this.prevKeyringLength) {
          let addedKey = "Key";
          if (keyring instanceof Set) {
            addedKey = "New Key";
          } else if (Array.isArray(keyring)) {
            addedKey = keyring[keyring.length - 1] ?? "Key";
          }
          this.show("item", "Key Acquired", `Found key: ${addedKey}`);
        }
        this.prevKeyringLength = currentLength;
      }),
    );

    // 2. Listen to Top-Level Inventory Changes (Handles both new pickups & stack increments precisely)
    this.unsubscribe.push(
      store.subscribe("inventory", payload => {
        const inventoryState = payload.value;
        const currentItems = inventoryState?.items ?? [];
        const currentQuantities = new Map<string, number>();

        for (const item of currentItems) {
          currentQuantities.set(item.instanceId, item.quantity);
          const prevQty = this.prevInventoryQuantities.get(item.instanceId) ?? 0;

          if (prevQty === 0) {
            // New item instance added
            this.show("item", "Item Collected", `Picked up ${item.definitionId} (x${item.quantity})!`);
          } else if (item.quantity > prevQty) {
            // Stackable quantity incremented
            const delta = item.quantity - prevQty;
            this.show("item", "Stack Updated", `${item.definitionId} (+${delta}) [Total: ${item.quantity}]`);
          }
        }

        this.prevInventoryQuantities = currentQuantities;
      }),
    );

    // 3. Listen to Progression / Level Changes
    this.unsubscribe.push(
      store.subscribe("progression.level", payload => {
        const newLevel = payload.value ?? 1;
        if (newLevel > this.prevLevel) {
          this.show("progression", "Level Up!", `Reached Level ${newLevel}! +1 Skill Point gained.`);
        }
        this.prevLevel = newLevel;
      }),
    );

    // 4. Listen to Active Quests
    this.unsubscribe.push(
      store.subscribe("quests.active", payload => {
        const currentActive = payload.value ?? {};
        for (const questId of Object.keys(currentActive)) {
          if (!this.prevActiveQuests[questId]) {
            this.show("quest", "Quest Accepted", `New Quest: ${questId}`);
          }
        }
        this.prevActiveQuests = { ...currentActive };
      }),
    );

    // 5. Listen to Completed Quests
    this.unsubscribe.push(
      store.subscribe("quests.completed", payload => {
        const completed = payload.value ?? [];
        const prevCompleted = payload.previousValue ?? [];
        if (completed.length > prevCompleted.length) {
          const latest = completed[completed.length - 1];
          this.show("quest", "Quest Completed", `Finished: ${latest}`);
        }
      }),
    );
  }

  public destroy(): void {
    this.unsubscribe.forEach(unsubscribe => unsubscribe());
    this.unsubscribe = [];
  }
}

// ─── Pure Rendering ScreenElement ────────────────────────────────────────────

export class ToastHUD extends ScreenElement {
  private toastGraphic: ToastGraphic;

  constructor(position?: Vector) {
    super({
      pos: position ?? vec(960 - 340, 20), // Top-right anchoring (960x540 canvas width)
      anchor: vec(0, 0),
      z: 100, // Rendered above standard HUD
    });

    this.toastGraphic = new ToastGraphic();
    this.graphics.use(this.toastGraphic);
  }

  public override onPreUpdate(_engine: any, delta: number): void {
    this.toastGraphic.updateAnimation(delta);
  }

  public show(category: ToastCategory, title: string, message: string, duration?: number): void {
    this.toastGraphic.show(category, title, message, duration);
  }
}

// ─── Pure Graphics Drawing Element ───────────────────────────────────────────

export class ToastGraphic extends Graphic {
  private activeToasts: ActiveToastInstance[] = [];
  private maxVisible: number = 4;
  private defaultDuration: number = 3500;
  private isDirty: boolean = true;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private readonly WIDTH = 320;
  private readonly HEIGHT = 64;
  private readonly SPACING = 10;

  constructor() {
    super({
      width: 320,
      height: 64,
    });
    this.width = this.WIDTH;
    this.height = 400;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.WIDTH;
    this.canvas.height = this.height;

    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to acquire 2D context for ToastGraphic");
    }
    this.ctx = context;
  }

  clone(): Graphic {
    return new ToastGraphic();
  }

  public show(category: ToastCategory, title: string, message: string, duration?: number): void {
    const id = "toast_" + Math.random().toString(36).substring(2, 9);
    const toastData: ToastMessage = {
      id,
      category,
      title,
      message,
      duration: duration ?? this.defaultDuration,
    };

    if (this.activeToasts.length >= this.maxVisible) {
      this.activeToasts.shift();
    }

    const newInstance: ActiveToastInstance = {
      data: toastData,
      elapsed: 0,
      duration: toastData.duration!,
      alpha: 0,
      targetY: 0,
      currentY: -40,
    };

    this.activeToasts.push(newInstance);
    this.recalculatePositions();
    this.isDirty = true;
  }

  private recalculatePositions(): void {
    let currentY = 0;
    for (let i = 0; i < this.activeToasts.length; i++) {
      this.activeToasts[i].targetY = currentY;
      currentY += this.HEIGHT + this.SPACING;
    }
  }

  public updateAnimation(delta: number): void {
    if (this.activeToasts.length === 0) return;

    let needsRedraw = false;

    for (let i = this.activeToasts.length - 1; i >= 0; i--) {
      const toast = this.activeToasts[i];
      toast.elapsed += delta;

      const diffY = toast.targetY - toast.currentY;
      if (Math.abs(diffY) > 0.5) {
        toast.currentY += diffY * 0.2;
        needsRedraw = true;
      } else {
        toast.currentY = toast.targetY;
      }

      const fadeTime = 250;
      if (toast.elapsed < fadeTime) {
        toast.alpha = toast.elapsed / fadeTime;
        needsRedraw = true;
      } else if (toast.duration - toast.elapsed < fadeTime) {
        toast.alpha = Math.max(0, (toast.duration - toast.elapsed) / fadeTime);
        needsRedraw = true;
      } else {
        toast.alpha = 1;
      }

      if (toast.elapsed >= toast.duration) {
        this.activeToasts.splice(i, 1);
        this.recalculatePositions();
        needsRedraw = true;
      }
    }

    if (needsRedraw || this.activeToasts.length > 0) {
      this.isDirty = true;
    }
  }

  protected _drawImage(ctx: ExcaliburGraphicsContext, x: number, y: number): void {
    if (this.activeToasts.length === 0) return;

    if (this.isDirty) {
      const { ctx: offCtx } = this;
      offCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (const toast of this.activeToasts) {
        offCtx.save();
        offCtx.globalAlpha = toast.alpha;
        offCtx.translate(0, toast.currentY);

        offCtx.fillStyle = "rgba(15, 23, 42, 0.92)";
        offCtx.strokeStyle = this.getAccentColor(toast.data.category);
        offCtx.lineWidth = 2;

        this.drawRoundedRect(offCtx, 0, 0, this.WIDTH, this.HEIGHT, 6);
        offCtx.fill();
        offCtx.stroke();

        offCtx.fillStyle = this.getAccentColor(toast.data.category);
        offCtx.fillRect(0, 0, 4, this.HEIGHT);

        offCtx.font = "20px sans-serif";
        offCtx.textBaseline = "middle";
        offCtx.fillText(this.getEmoji(toast.data.category), 16, this.HEIGHT / 2);

        offCtx.fillStyle = this.getAccentColor(toast.data.category);
        offCtx.font = "bold 13px sans-serif";
        offCtx.textBaseline = "top";
        offCtx.fillText(toast.data.title, 52, 12);

        offCtx.fillStyle = "#cbd5e1";
        offCtx.font = "12px sans-serif";
        offCtx.fillText(toast.data.message, 52, 32);

        offCtx.restore();
      }

      this.canvas.setAttribute("forceUpload", "true");
      this.isDirty = false;
    }

    ctx.drawImage(this.canvas, x, y);
  }

  private getAccentColor(category: ToastCategory): string {
    switch (category) {
      case "quest":
        return "#eab308";
      case "item":
        return "#22c55e";
      case "enemy":
        return "#f97316";
      case "dungeon":
        return "#a855f7";
      case "progression":
        return "#3b82f6";
      default:
        return "#ffffff";
    }
  }

  private getEmoji(category: ToastCategory): string {
    switch (category) {
      case "quest":
        return "📜";
      case "item":
        return "🎒";
      case "enemy":
        return "⚠️";
      case "dungeon":
        return "🗺️";
      case "progression":
        return "⭐";
      default:
        return "💡";
    }
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
