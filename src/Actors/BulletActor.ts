import { Actor, Collider, CollisionContact, CollisionStartEvent, CollisionType, Entity, Side, vec } from "excalibur";
import { ContentRegistry } from "../Content/ContentRegistry";
import { getAnimationByKey } from "../Animations/animationRegistry";
import { EncounterEnemy } from "./EncounterEnemy";

export class BulletActor extends Actor {
  constructor(
    private readonly contentRegistry: ContentRegistry,
    public x: number,
    public y: number,
    public velocityX: number,
    public velocityY: number,
    public textureId: string,
  ) {
    super({
      width: 16,
      height: 16,
      pos: vec(x, y),
      vel: vec(velocityX, velocityY),
      z: 10000,
      collisionType: CollisionType.Passive,
    });
  }

  onInitialize(): void {
    // Safety failsafe: if bullet does not collide within 3 seconds, kill it so cutscene doesn't stall
    setTimeout(() => {
      if (!this.isKilled()) {
        this.kill();
      }
    }, 3000);
  }

  onAdd(): void {
    // 1. Check if textureId directly matches a registered animation key (e.g. "fireball_bullet")
    let anim = getAnimationByKey(this.textureId);

    // 2. If not found, try looking it up as a spell ID to extract its bulletTextureKey
    if (!anim) {
      try {
        const spell = this.contentRegistry.getSpell(this.textureId);
        if (spell?.bulletTextureKey) {
          anim = getAnimationByKey(spell.bulletTextureKey);
        }
      } catch {
        // Not a spell ID
      }
    }

    if (anim) {
      this.graphics.use(anim);
    }
  }

  onCollisionStart(self: Collider, other: Collider, side: Side, contact: CollisionContact): void {
    // Handle collision logic here, e.g., apply damage, play effects, etc.
    if (other.owner instanceof EncounterEnemy) {
      console.log(`Bullet hit enemy: ${other.owner.name}`);
      this.kill(); // Remove the bullet after collision
    }
  }
}
