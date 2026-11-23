import { Action, Actor, Sprite, Vector, nextActionId, vec, Animation } from "excalibur";
import { Resources } from "../resources";
import { getAnimationByKey } from "../Animations/animationRegistry";

class enemyShakeAction implements Action {
  public id = nextActionId();
  private actor: Actor;
  private originalPos: Vector;
  private shakeDuration = 200;
  private shakeDistance = 5;
  elapsed = 0;

  constructor(actor: Actor) {
    this.actor = actor;
    this.originalPos = actor.pos;
  }

  update(elapsedTime: number): void {
    this.elapsed += elapsedTime;
    const shakeOffset = Math.sin(this.elapsed / 20) * this.shakeDistance;
    this.actor.pos = vec(this.originalPos.x + shakeOffset, this.originalPos.y);
  }

  isComplete(): boolean {
    return this.elapsed >= this.shakeDuration;
  }

  stop(): void {
    this.actor.pos = this.originalPos;
  }

  reset(): void {
    this.actor.pos = this.originalPos;
  }
}

export class EncounterEnemy extends Actor {
  enemyId: string;
  effectChild: Actor | null = null;

  constructor(pos: Vector, width: number, height: number, sprite: Sprite, enemyId: string) {
    super({ name: enemyId, pos, width, height });
    this.enemyId = enemyId;
    // const enemyImg = Resources.goblinToken.toSprite();
    this.graphics.use(sprite);
    this.effectChild = new Actor({
      pos: vec(0, 0),
      width: 64,
      height: 64,
    });
    this.addChild(this.effectChild);
  }

  playHitAnimation(animationKey?: string): Animation | undefined {
    this.actions.runAction(new enemyShakeAction(this));
    if (animationKey) {
      let anim = getAnimationByKey(animationKey);
      console.log(`Playing hit animation for enemy ${this.enemyId} with animationKey: ${animationKey}`);
      if (anim && this.effectChild) {
        this.effectChild?.graphics.use(anim);
        return anim;
      }
    }
  }
}
