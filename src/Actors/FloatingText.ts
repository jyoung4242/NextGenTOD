// Actors/FloatingText.ts
import { Actor, Color, Font, Text, Vector, vec } from "excalibur";

export interface FloatingTextOptions {
  text: string;
  pos: Vector;
  color?: Color;
  fontSize?: number;
  /** Reserved for future animation/effect hooks (e.g., 'crit', 'heal', 'status') */
  styleTag?: string;
}

export class FloatingText extends Actor {
  private lifetime: number = 0.8; // Duration in seconds
  private elapsed: number = 0;
  private initialPos: Vector;
  private floatOffset: Vector = vec(0, 0);
  private textGraphic: Text;

  constructor(options: FloatingTextOptions) {
    super({
      pos: options.pos,
      z: 15, // Above target reticles (10) and status HUD (5)
    });

    this.initialPos = options.pos.clone();

    this.textGraphic = new Text({
      text: options.text,
      font: new Font({
        family: "sans-serif",
        size: options.fontSize ?? 16,
        color: options.color ?? Color.White,
      }),
    });

    this.graphics.use(this.textGraphic);
  }

  public override onPostUpdate(_engine: any, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.elapsed += dt;

    if (this.elapsed >= this.lifetime) {
      this.kill();
      return;
    }

    // Calculate upward drift distance (35 pixels per second upwards)
    const floatDistance = -35 * this.elapsed;
    this.floatOffset = vec(0, floatDistance);

    // Set position directly instead of mutating
    this.pos = this.initialPos.add(this.floatOffset);

    // Smooth alpha fade-out during the second half of its lifetime
    const progress = this.elapsed / this.lifetime;
    if (progress > 0.5) {
      this.graphics.opacity = 1 - (progress - 0.5) * 2;
    }
  }
}
