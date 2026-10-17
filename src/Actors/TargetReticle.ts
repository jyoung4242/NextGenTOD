// Systems/TargetReticle.ts
import { Actor, Canvas, Color, vec } from "excalibur";

export interface TargetReticleOptions {
  tileSize: number;
}

export class TargetReticle extends Actor {
  private tileSize: number;
  private pulseTime: number = 0;

  constructor(options: TargetReticleOptions) {
    const { tileSize } = options;
    super({
      width: tileSize,
      height: tileSize,
      z: 10, // Ensure reticle renders above tile map and entity tokens
    });

    this.tileSize = tileSize;

    // Create a custom Canvas graphic to draw corners and reticle details
    const canvasGraphic = new Canvas({
      width: tileSize,
      height: tileSize,
      draw: ctx => {
        const padding = 2;
        const cornerLen = 8;
        const w = this.tileSize - padding * 2;
        const h = this.tileSize - padding * 2;

        ctx.strokeStyle = "#ef4444"; // Red targeting outline
        ctx.lineWidth = 2;

        ctx.save();
        ctx.translate(padding, padding);

        // Top-Left corner
        ctx.beginPath();
        ctx.moveTo(0, cornerLen);
        ctx.lineTo(0, 0);
        ctx.lineTo(cornerLen, 0);
        ctx.stroke();

        // Top-Right corner
        ctx.beginPath();
        ctx.moveTo(w - cornerLen, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, cornerLen);
        ctx.stroke();

        // Bottom-Right corner
        ctx.beginPath();
        ctx.moveTo(w, h - cornerLen);
        ctx.lineTo(w, h);
        ctx.lineTo(w - cornerLen, h);
        ctx.stroke();

        // Bottom-Left corner
        ctx.beginPath();
        ctx.moveTo(cornerLen, h);
        ctx.lineTo(0, h);
        ctx.lineTo(0, h - cornerLen);
        ctx.stroke();

        // Center crosshair dot
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(w / 2 - 1, h / 2 - 1, 2, 2);

        ctx.restore();
      },
    });

    this.graphics.use(canvasGraphic);
  }

  /**
   * On post-update, calculate a sine wave to softly pulse the reticle opacity between 0.25 and 0.75.
   */
  public onPostUpdate(_engine: any, deltaMs: number): void {
    this.pulseTime += deltaMs * 0.003; // Adjust multiplier for pulse speed
    // Sine wave normalized between ~0.25 and ~0.75
    const opacity = 0.25 + (Math.sin(this.pulseTime) + 1) * 0.25;
    this.graphics.opacity = opacity;
  }
}
