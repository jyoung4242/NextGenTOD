import { Direction, DirectionalSpriteSet, SpriteViewDirection4 } from "../GameTypes";

const CARDINAL_ANGLES: Record<Direction, number> = {
  east: 0,
  south: Math.PI / 2,
  west: Math.PI,
  north: (3 * Math.PI) / 2,
};

export interface ResolvedDirectionalSprite {
  textureKey: string;
  flipHorizontal: boolean;
}

export function resolveDirectionalSprite(
  spriteSet: DirectionalSpriteSet,
  facing: Direction,
  objX: number,
  objY: number,
  camX: number,
  camY: number,
): ResolvedDirectionalSprite {
  const facingAngle = CARDINAL_ANGLES[facing];
  const viewAngle = Math.atan2(camY - objY, camX - objX);

  let delta = viewAngle - facingAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;

  let bucket: SpriteViewDirection4;
  if (delta >= -Math.PI / 4 && delta < Math.PI / 4) {
    bucket = "front";
  } else if (delta >= Math.PI / 4 && delta < (3 * Math.PI) / 4) {
    bucket = "right";
  } else if (delta >= -(3 * Math.PI) / 4 && delta < -Math.PI / 4) {
    bucket = "left";
  } else {
    bucket = "back";
  }

  let flipHorizontal = false;
  let textureKey = spriteSet.variants?.[bucket] ?? `${spriteSet.baseKey}_${bucket}`;

  if (spriteSet.mirrorHorizontal) {
    if (bucket === "right" && !spriteSet.variants?.right && spriteSet.variants?.left) {
      textureKey = spriteSet.variants.left;
      flipHorizontal = true;
    } else if (bucket === "left" && !spriteSet.variants?.left && spriteSet.variants?.right) {
      textureKey = spriteSet.variants.right;
      flipHorizontal = true;
    }
  }

  return { textureKey, flipHorizontal };
}
