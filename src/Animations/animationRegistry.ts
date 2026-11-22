// src/Animations/animationRegistry.ts
import { Animation } from "excalibur";
import { FireBulletAnimation } from "./fireBullet";
import { FireHitAnimations } from "./fireballHitAnimation";
import { LightningHit } from "./lightningHit";
import { LightningBullet } from "./lightningbullet";
import { LightningCharge } from "./lightningCharge";

const animationMap = new Map<string, Animation>();

// Register animations (including "fireball_bullet" matching spellRegistry.ts)
animationMap.set("fireballBullet", FireBulletAnimation.Fire);
animationMap.set("fireball_bullet", FireBulletAnimation.Fire);
animationMap.set("fireballHit", FireHitAnimations.Hit); // Placeholder for fireball hit animation
animationMap.set("lightning_bullet", LightningBullet.Fire); // Placeholder for lightning bullet animation
animationMap.set("lightningHit", LightningHit.Hit); // Placeholder for lightning hit animation
animationMap.set("lightningCharge", LightningCharge.Charge); // Placeholder for lightning charge animation

export function getAnimationByKey(key: string): Animation | undefined {
  return animationMap.get(key);
}

export { FireBulletAnimation, FireHitAnimations };
