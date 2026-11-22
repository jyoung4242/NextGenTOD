import { ImageSource, SpriteSheet, Animation, AnimationStrategy } from "excalibur";
import { Resources } from "../resources";

// Create spritesheet using grid-based parsing
const spriteSheet = SpriteSheet.fromImageSource({
  image: Resources.lightningBullet,
  grid: {
    rows: 1,
    columns: 1,
    spriteWidth: 32,
    spriteHeight: 32,
  },
});

// Frame graphics (with optional per-frame flipping)

const Animation1_Frame0Graphic = spriteSheet.sprites[0];

// Animation definitions

const Animation1Base = new Animation({
  frames: [{ graphic: Animation1_Frame0Graphic, duration: 150 }],
  strategy: AnimationStrategy.Loop,
});

const Fire = Animation1Base;

export const LightningBullet = {
  Fire,
};
