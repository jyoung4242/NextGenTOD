import { SpriteSheet, Animation, AnimationStrategy } from "excalibur";
import { Resources } from "../resources";

// Create spritesheet using grid-based parsing
const spriteSheet = SpriteSheet.fromImageSource({
  image: Resources.fireballCharge,
  grid: {
    rows: 1,
    columns: 24,
    spriteWidth: 96,
    spriteHeight: 96,
  },
});

// Frame graphics (with optional per-frame flipping)

const Charge_Frame0Graphic = spriteSheet.sprites[0];
const Charge_Frame1Graphic = spriteSheet.sprites[1];
const Charge_Frame2Graphic = spriteSheet.sprites[2];
const Charge_Frame3Graphic = spriteSheet.sprites[3];
const Charge_Frame4Graphic = spriteSheet.sprites[4];
const Charge_Frame5Graphic = spriteSheet.sprites[5];
const Charge_Frame6Graphic = spriteSheet.sprites[6];
const Charge_Frame7Graphic = spriteSheet.sprites[7];
const Charge_Frame8Graphic = spriteSheet.sprites[8];
const Charge_Frame9Graphic = spriteSheet.sprites[9];
const Charge_Frame10Graphic = spriteSheet.sprites[10];
const Charge_Frame11Graphic = spriteSheet.sprites[11];
const Charge_Frame12Graphic = spriteSheet.sprites[12];
const Charge_Frame13Graphic = spriteSheet.sprites[13];
const Charge_Frame14Graphic = spriteSheet.sprites[14];
const Charge_Frame15Graphic = spriteSheet.sprites[15];
const Charge_Frame16Graphic = spriteSheet.sprites[16];
const Charge_Frame17Graphic = spriteSheet.sprites[17];
const Charge_Frame18Graphic = spriteSheet.sprites[18];
const Charge_Frame19Graphic = spriteSheet.sprites[19];
const Charge_Frame20Graphic = spriteSheet.sprites[20];
const Charge_Frame21Graphic = spriteSheet.sprites[21];
const Charge_Frame22Graphic = spriteSheet.sprites[22];
const Charge_Frame23Graphic = spriteSheet.sprites[23];

// Animation definitions

const ChargeBase = new Animation({
  frames: [
    { graphic: Charge_Frame0Graphic, duration: 90 },
    { graphic: Charge_Frame1Graphic, duration: 90 },
    { graphic: Charge_Frame2Graphic, duration: 90 },
    { graphic: Charge_Frame3Graphic, duration: 90 },
    { graphic: Charge_Frame4Graphic, duration: 90 },
    { graphic: Charge_Frame5Graphic, duration: 90 },
    { graphic: Charge_Frame6Graphic, duration: 90 },
    { graphic: Charge_Frame7Graphic, duration: 90 },
    { graphic: Charge_Frame8Graphic, duration: 90 },
    { graphic: Charge_Frame9Graphic, duration: 90 },
    { graphic: Charge_Frame10Graphic, duration: 90 },
    { graphic: Charge_Frame11Graphic, duration: 90 },
    { graphic: Charge_Frame12Graphic, duration: 90 },
    { graphic: Charge_Frame13Graphic, duration: 90 },
    { graphic: Charge_Frame14Graphic, duration: 90 },
    { graphic: Charge_Frame15Graphic, duration: 90 },
    { graphic: Charge_Frame16Graphic, duration: 90 },
    { graphic: Charge_Frame17Graphic, duration: 90 },
    { graphic: Charge_Frame18Graphic, duration: 90 },
    { graphic: Charge_Frame19Graphic, duration: 90 },
    { graphic: Charge_Frame20Graphic, duration: 90 },
    { graphic: Charge_Frame21Graphic, duration: 90 },
    { graphic: Charge_Frame22Graphic, duration: 90 },
    { graphic: Charge_Frame23Graphic, duration: 90 },
  ],
  strategy: AnimationStrategy.End,
});

const Charge = ChargeBase;

export const FireChargeAnimation = {
  Charge,
};
