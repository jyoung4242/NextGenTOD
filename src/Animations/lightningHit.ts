import { ImageSource, SpriteSheet, Animation, AnimationStrategy } from "excalibur";
import { Resources } from "../resources";

// Create spritesheet using grid-based parsing
const spriteSheet = SpriteSheet.fromImageSource({
  image: Resources.lightningHit,
  grid: {
    rows: 1,
    columns: 9,
    spriteWidth: 64,
    spriteHeight: 64,
  },
});

// Frame graphics (with optional per-frame flipping)

const Hit_Frame0Graphic = spriteSheet.sprites[0];
const Hit_Frame1Graphic = spriteSheet.sprites[1];
const Hit_Frame2Graphic = spriteSheet.sprites[2];
const Hit_Frame3Graphic = spriteSheet.sprites[3];
const Hit_Frame4Graphic = spriteSheet.sprites[4];
const Hit_Frame5Graphic = spriteSheet.sprites[5];
const Hit_Frame6Graphic = spriteSheet.sprites[6];
const Hit_Frame7Graphic = spriteSheet.sprites[7];
const Hit_Frame8Graphic = spriteSheet.sprites[8];

// Animation definitions

const HitBase = new Animation({
  frames: [
    { graphic: Hit_Frame0Graphic, duration: 75 },
    { graphic: Hit_Frame1Graphic, duration: 75 },
    { graphic: Hit_Frame2Graphic, duration: 75 },
    { graphic: Hit_Frame3Graphic, duration: 75 },
    { graphic: Hit_Frame4Graphic, duration: 75 },
    { graphic: Hit_Frame5Graphic, duration: 75 },
    { graphic: Hit_Frame6Graphic, duration: 75 },
    { graphic: Hit_Frame7Graphic, duration: 75 },
    { graphic: Hit_Frame8Graphic, duration: 75 },
  ],
  strategy: AnimationStrategy.End,
});

const Hit = HitBase;

export const LightningHit = {
  Hit,
};
