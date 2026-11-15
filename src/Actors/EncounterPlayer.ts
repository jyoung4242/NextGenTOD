import { Actor, vec, Vector } from "excalibur";
import { Resources } from "../resources";
import { PlayerMeleeAnimation } from "../Animations/playerMelee";
import { EncounterEnemy } from "./EncounterEnemy";

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
  meleePosition: Vector = MELEE_POSITIONS.right;

  constructor(pos: Vector, width: number, height: number) {
    super({ name: "player", pos, width, height });
    const playerImg = Resources.playerToken.toSprite();
    this.graphics.use(playerImg);
    this.meleeChild = new Actor({ pos: vec(0, 0), width: width * 0.5, height: height * 0.5, z: 10000 });
    this.addChild(this.meleeChild);
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
