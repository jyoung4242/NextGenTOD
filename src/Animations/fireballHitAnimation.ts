import { ImageSource, SpriteSheet, Animation, AnimationStrategy } from "excalibur";
import { Resources } from "../resources";

// Create spritesheet using grid-based parsing
const spriteSheet = SpriteSheet.fromImageSource({
  image: Resources.fireballHit,
  grid: {
    rows: 1,
    columns: 8,
    spriteWidth: 64,
    spriteHeight: 64,
  },
});

// Frame graphics (with optional per-frame flipping)

const Animation1_Frame0Graphic = spriteSheet.sprites[0];
const Animation1_Frame1Graphic = spriteSheet.sprites[1];
const Animation1_Frame2Graphic = spriteSheet.sprites[2];
const Animation1_Frame3Graphic = spriteSheet.sprites[3];
const Animation1_Frame4Graphic = spriteSheet.sprites[4];
const Animation1_Frame5Graphic = spriteSheet.sprites[5];
const Animation1_Frame6Graphic = spriteSheet.sprites[6];
const Animation1_Frame7Graphic = spriteSheet.sprites[7];

// Animation definitions

const Animation1Base = new Animation({
  frames: [
    { graphic: Animation1_Frame0Graphic, duration: 75 },
    { graphic: Animation1_Frame1Graphic, duration: 75 },
    { graphic: Animation1_Frame2Graphic, duration: 75 },
    { graphic: Animation1_Frame3Graphic, duration: 75 },
    { graphic: Animation1_Frame4Graphic, duration: 75 },
    { graphic: Animation1_Frame5Graphic, duration: 75 },
    { graphic: Animation1_Frame6Graphic, duration: 75 },
    { graphic: Animation1_Frame7Graphic, duration: 75 },
  ],
  strategy: AnimationStrategy.End,
});

const Hit = Animation1Base;

export const FireHitAnimations = {
  Hit,
};
