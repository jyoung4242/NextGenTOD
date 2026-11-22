import { ImageSource, SpriteSheet, Animation, AnimationStrategy } from "excalibur";
import { Resources } from "../resources";

// Create spritesheet using grid-based parsing
const spriteSheet = SpriteSheet.fromImageSource({
  image: Resources.fireballBullet,
  grid: {
    rows: 1,
    columns: 4,
    spriteWidth: 32,
    spriteHeight: 16,
  },
});

// Frame graphics (with optional per-frame flipping)

const Fire_Frame0Graphic = spriteSheet.sprites[0];
const Fire_Frame1Graphic = spriteSheet.sprites[1];
const Fire_Frame2Graphic = spriteSheet.sprites[2];
const Fire_Frame3Graphic = spriteSheet.sprites[3];

// Animation definitions

const FireBase = new Animation({
  frames: [
    { graphic: Fire_Frame0Graphic, duration: 75 },
    { graphic: Fire_Frame1Graphic, duration: 75 },
    { graphic: Fire_Frame2Graphic, duration: 75 },
    { graphic: Fire_Frame3Graphic, duration: 75 },
  ],
  strategy: AnimationStrategy.Loop,
});

const Fire = FireBase;

export const FireBulletAnimation = {
  Fire,
};
