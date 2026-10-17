import { Color, ExcaliburGraphicsContext, Graphic, ScreenElement, vec, Sprite, Engine } from "excalibur";
import { drawText, CanvasTextConfig } from "canvas-txt";

export interface ActionCardData {
  id: string;
  label: string;
  sprite: Sprite;
}

export interface ActionCarouselOptions {
  gameActions: ActionCardData[];
  onActionSelected: (action: ActionCardData) => void;
}

export class ActionCarouselUI extends ScreenElement {
  private currentIndex: number = 0; // Continuous floating index for infinite rolling
  private gameActions: ActionCardData[];
  private onActionSelected: (action: ActionCardData) => void;
  private carouselGraphic: CarouselLayoutGraphic;

  constructor(options: ActionCarouselOptions) {
    super({
      width: 800,
      height: 250,
      pos: vec(0, 50),
      color: Color.Transparent,
    });

    this.gameActions = options.gameActions;
    this.onActionSelected = options.onActionSelected;

    this.carouselGraphic = new CarouselLayoutGraphic(this.gameActions);
    this.graphics.use(this.carouselGraphic);
  }

  public nextCard(direction: number): void {
    this.rotate(direction);
  }

  public getSelectedAction(): ActionCardData {
    const total = this.gameActions.length;
    // Safely resolve active index accounting for infinite floating scrolling
    const activeIndex = ((Math.round(this.currentIndex) % total) + total) % total;
    return this.gameActions[activeIndex];
  }

  public rotate(direction: number): void {
    if (this.gameActions.length === 0) return;

    // Increment continuously without hard clamping to array length bounds
    this.currentIndex += direction;
    this.carouselGraphic.setTargetIndex(this.currentIndex);
  }

  public confirmSelection(): void {
    const total = this.gameActions.length;
    // Resolve the true active item using clean safe modulo handling negative numbers
    const activeIndex = ((Math.round(this.currentIndex) % total) + total) % total;
    const selected = this.gameActions[activeIndex];
    this.onActionSelected(selected);
  }

  public override onPreUpdate(_engine: Engine, delta: number): void {
    super.onPreUpdate(_engine, delta);
    this.carouselGraphic.updateAnimation(delta);
  }
}

class CarouselLayoutGraphic extends Graphic {
  private targetIndex: number = 0;
  private displayIndex: number = 0;
  private cards: CardGraphicCache[];

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDirty: boolean = true;

  constructor(private actions: ActionCardData[]) {
    super({ width: 800, height: 250 });

    this.cards = actions.map(action => new CardGraphicCache(action));

    this.canvas = document.createElement("canvas");
    this.canvas.width = 800;
    this.canvas.height = 255;

    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Failed to get 2D context for CarouselLayoutGraphic");
    this.ctx = context;
  }

  public setTargetIndex(index: number): void {
    this.targetIndex = index;
    this.isDirty = true;
  }

  public updateAnimation(_delta: number): void {
    const diff = this.targetIndex - this.displayIndex;
    if (Math.abs(diff) > 0.001) {
      this.displayIndex += diff * 0.2;
      this.isDirty = true;
    } else {
      this.displayIndex = this.targetIndex;
    }
  }

  clone(): Graphic {
    return new CarouselLayoutGraphic(this.actions);
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    if (this.isDirty) {
      this.redrawCarousel();
      this.isDirty = false;
    }

    this.canvas.setAttribute("forceUpload", "true");
    ex.drawImage(this.canvas, x, y, this.width, this.height);
  }

  private redrawCarousel(): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);

    const total = this.cards.length;
    const containerCenterX = 400;
    const cardWidth = 120;

    // Render a window of cards around the current float index to simulate an infinite track
    // We render roughly 5 slots (-2 to +2 around displayIndex)
    const centerSlot = Math.round(this.displayIndex);

    for (let slot = centerSlot - 3; slot <= centerSlot + 3; slot++) {
      // Map virtual slot index to actual card array index using safe wrap-around modulo
      const arrayIndex = ((slot % total) + total) % total;
      const cardCache = this.cards[arrayIndex];

      // Calculate exact visual offset relative to smooth displayIndex
      const offset = slot - this.displayIndex;

      const targetX = containerCenterX + offset * 135 - cardWidth / 2;
      const targetY = 50 + Math.abs(offset) * 15;
      const scale = Math.max(0.6, 1.1 - Math.abs(offset) * 0.3);
      const opacity = Math.max(0, 1.0 - Math.abs(offset) * 0.35);
      const isHighlighted = Math.abs(offset) < 0.5;

      cardCache.setHighlight(isHighlighted);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(targetX + cardWidth / 2, targetY + 70);
      ctx.scale(scale, scale);
      ctx.translate(-cardWidth / 2, -70);

      cardCache.drawTo(ctx, 0, targetY);
      ctx.restore();
    }
  }
}

class CardGraphicCache {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isHighlighted: boolean = false;
  private isDirty: boolean = true;
  private width = 120;
  private height = 144;

  constructor(private action: ActionCardData) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Failed to get 2D context for CardGraphicCache");
    this.ctx = context;
  }

  public setHighlight(highlighted: boolean): void {
    if (this.isHighlighted !== highlighted) {
      this.isHighlighted = highlighted;
      this.isDirty = true;
    }
  }

  public drawTo(targetCtx: CanvasRenderingContext2D, x: number, y: number): void {
    if (this.isDirty) {
      this.redrawCard();
      this.isDirty = false;
    }
    targetCtx.drawImage(this.canvas, x, y);
  }

  private redrawCard(): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);

    const cardHeight = 136;
    const offsetY = 2;

    // 1. Card Background
    ctx.fillStyle = this.isHighlighted ? "#252538" : "#15151a";
    ctx.fillRect(0, offsetY, this.width, cardHeight);

    // 2. Card Border
    ctx.strokeStyle = this.isHighlighted ? "#ffcc00" : "#444455";
    ctx.lineWidth = this.isHighlighted ? 3 : 1;
    ctx.strokeRect(1, offsetY + 1, this.width - 2, cardHeight - 2);

    // 3. Icon backdrop circle
    const spriteSize = 48;
    const spriteX = (this.width - spriteSize) / 2;
    const spriteY = offsetY + 20;

    ctx.fillStyle = this.isHighlighted ? "#33334d" : "#1e1e28";
    ctx.beginPath();
    ctx.arc(this.width / 2, spriteY + spriteSize / 2, 26, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw Sprite
    this.action.sprite._drawImage(exFakeContext(ctx), spriteX, spriteY);

    // 5. Label Text
    const textConfig: CanvasTextConfig = {
      x: 10,
      y: offsetY + 95,
      width: this.width - 20,
      height: 40,
      lineHeight: 18,
      font: "Arial",
      fontSize: 14,
    };

    ctx.fillStyle = this.isHighlighted ? "#ffffff" : "#888888";
    drawText(ctx, this.action.label, textConfig);
  }
}

function exFakeContext(ctx: CanvasRenderingContext2D): ExcaliburGraphicsContext {
  return ctx as unknown as ExcaliburGraphicsContext;
}
