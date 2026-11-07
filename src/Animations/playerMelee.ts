import { ImageSource, SpriteSheet, Animation, AnimationStrategy } from "excalibur";
import { Resources } from "../resources";

// Create spritesheet using grid-based parsing
const spriteSheet = SpriteSheet.fromImageSource({
  image: Resources.meleeSS,
  grid: {
    rows: 2,
    columns: 8,
    spriteWidth: 104,
    spriteHeight: 64,
  },
});

// Frame graphics (with optional per-frame flipping)

const Animation1_Frame0Graphic = spriteSheet.sprites[7];
const Animation1_Frame1Graphic = spriteSheet.sprites[8];
const Animation1_Frame2Graphic = spriteSheet.sprites[9];
const Animation1_Frame3Graphic = spriteSheet.sprites[10];
const Animation1_Frame4Graphic = spriteSheet.sprites[11];

// Animation definitions

const Animation1Base = new Animation({
  frames: [
    { graphic: Animation1_Frame0Graphic, duration: 70 },
    { graphic: Animation1_Frame1Graphic, duration: 70 },
    { graphic: Animation1_Frame2Graphic, duration: 70 },
    { graphic: Animation1_Frame3Graphic, duration: 70 },
    { graphic: Animation1_Frame4Graphic, duration: 70 },
  ],
  strategy: AnimationStrategy.End,
});

const Animation1 = Animation1Base;

export const PlayerMeleeAnimation = Animation1;
