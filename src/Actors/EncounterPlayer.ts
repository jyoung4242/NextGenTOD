import { Actor, vec, Vector } from "excalibur";
import { Resources } from "../resources";
import { PlayerMeleeAnimation } from "../Animations/playerMelee";
import { FireChargeAnimation } from "../Animations/fireChargeAnimation";
import { EncounterEnemy } from "./EncounterEnemy";
import { EncounterScene } from "../Scenes/EncounterScene";
import { BulletActor } from "./BulletActor";
import { getAnimationByKey } from "../Animations/animationRegistry";

const MELEE_POSITIONS = {
  up: vec(0, -1),
  down: vec(0, 1),
  left: vec(-1, 0),
  right: vec(1, 0),
} as const;

const MELEE_ANGLES = {
  up: -Math.PI / 2,
  down: Math.PI / 2,
  left: Math.PI,
  right: 0,
} as const;

export class EncounterPlayer extends Actor {
  meleeChild: Actor;
  magicChild: Actor;
  meleePosition: Vector = MELEE_POSITIONS.right;

  constructor(pos: Vector, width: number, height: number) {
    super({ name: "player", pos, width, height });
    const playerImg = Resources.playerToken.toSprite();
    this.graphics.use(playerImg);
    this.meleeChild = new Actor({ pos: vec(0, 0), width: width * 0.5, height: height * 0.5, z: 10000 });
    this.addChild(this.meleeChild);
    this.magicChild = new Actor({ pos: vec(0, 0), width: width * 0.5, height: height * 0.5, z: 10000 });
    this.addChild(this.magicChild);
  }

  setMeleePosition(): void {
    this.meleeChild.pos = vec(this.meleePosition.x * this.width * 0.5, this.meleePosition.y * this.height * 0.5);
  }

  getMeleePosition(): Vector {
    return this.meleePosition;
  }

  playMeleeAnimation(direction: Vector, target: EncounterEnemy): void {
    console.log("direction: ", direction);

    this.normalizeMeleePosition(direction);
    this.setMeleePosition();
    PlayerMeleeAnimation.events.once("end", () => {
      this.resetMeleeAnimation();
      target.playHitAnimation();
    });
    PlayerMeleeAnimation.reset();
    this.meleeChild.graphics.use(PlayerMeleeAnimation);
  }

  resetMeleeAnimation(): void {
    this.meleeChild.graphics.hide();
  }

  async playMagicAnimation(direction: Vector, target: EncounterEnemy, spellKey: string): Promise<void> {
    // play charge animation
    let animation = getAnimationByKey(spellKey);
    if (!animation) {
      console.warn(`No animation found for spellKey: ${spellKey}. Using default fireballCharge animation.`);
      animation = FireChargeAnimation.Charge;
    }
    animation?.reset();
    // FireChargeAnimation.Charge.reset();

    this.magicChild.graphics.use(animation);
    return new Promise(resolve => {
      animation?.events.once("end", () => {
        // after charge animation, fire bullet
        this.resetMagicAnimation();
        // let content = (this.scene as EncounterScene).contentRegistry;
        // const bullet = new BulletActor(content, this.pos.x, this.pos.y, direction.x * 5, direction.y * 5, "fireball");
        // this.scene!.add(bullet);
        resolve();
      });
    });
  }

  resetMagicAnimation(): void {
    this.magicChild.graphics.hide();
  }

  normalizeMeleePosition(direction: Vector): void {
    // normalize to directional vectors
    if (Math.abs(direction.x) > Math.abs(direction.y)) {
      this.meleePosition = direction.x > 0 ? MELEE_POSITIONS.right : MELEE_POSITIONS.left;
      if (this.meleePosition === MELEE_POSITIONS.right) {
        this.meleeChild.rotation = MELEE_ANGLES.right;
      } else {
        this.meleeChild.rotation = MELEE_ANGLES.left;
      }
    } else {
      this.meleePosition = direction.y > 0 ? MELEE_POSITIONS.down : MELEE_POSITIONS.up;
      if (this.meleePosition === MELEE_POSITIONS.down) {
        this.meleeChild.rotation = MELEE_ANGLES.down;
      } else {
        this.meleeChild.rotation = MELEE_ANGLES.up;
      }
    }
  }
}
