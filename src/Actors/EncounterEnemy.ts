import { Actor, Sprite, Vector } from "excalibur";
import { Resources } from "../resources";

export class EncounterEnemy extends Actor {
  constructor(pos: Vector, width: number, height: number, sprite: Sprite) {
    super({ pos, width, height });
    const enemyImg = Resources.goblinToken.toSprite();
    this.graphics.use(sprite);
  }
}
