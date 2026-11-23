// CinematicImageGraphic.ts
import { Graphic, ExcaliburGraphicsContext, Sprite } from "excalibur";

export class CinematicImageGraphic extends Graphic {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sprite: Sprite | null = null;
  private isDirty = true;

  constructor(width: number, height: number, sprite?: Sprite | null) {
    super({ width, height });
    this.sprite = sprite ?? null;

    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to acquire 2D context for CinematicImageGraphic");
    }
    this.ctx = ctx;
  }

  public setSprite(sprite: Sprite | null, width?: number, height?: number): void {
    this.sprite = sprite;
    if (width && height) {
      this.width = width;
      this.height = height;
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.isDirty = true;
  }

  public flagDirty(): void {
    this.isDirty = true;
  }

  public override clone(): CinematicImageGraphic {
    return new CinematicImageGraphic(this.width, this.height, this.sprite);
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    if (this.isDirty) {
      this.redraw();
      this.isDirty = false;
    }

    this.canvas.setAttribute("forceUpload", "true");
    ex.drawImage(this.canvas, x, y, this.canvas.width, this.canvas.height);
  }

  private redraw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const img = this.sprite?.image?.image;
    if (!img) return;

    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
  }
}
