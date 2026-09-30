// Actors/DungeonPlayer.ts
import { StateStore } from "../GameState";
import { GameState, DungeonCamera, Direction } from "../GameTypes";
import { Dungeon } from "../Lib/Managers/DungeonManager";
import { InteractionSystem } from "../Lib/Systems/InteractionSystem";

const CARDINAL_ANGLES: Record<Direction, number> = {
  east: 0,
  south: Math.PI / 2,
  west: Math.PI,
  north: (3 * Math.PI) / 2,
};

const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  east: "west",
  west: "east",
  north: "south",
  south: "north",
};

const DIRECTIONS: Direction[] = ["east", "south", "west", "north"];

export class DungeonPlayer {
  private currentDirectionIndex = 0;

  constructor(
    private readonly store: StateStore<GameState>,
    private readonly dungeon: Dungeon,
    private readonly camera: DungeonCamera,
    private readonly interactionSystem: InteractionSystem,
  ) {
    const pos = this.store.get("player.position");
    this.camera.x = pos.x;
    this.camera.y = pos.y;
    this.camera.angle = CARDINAL_ANGLES[DIRECTIONS[this.currentDirectionIndex]];
  }

  public get currentDirection(): Direction {
    return DIRECTIONS[this.currentDirectionIndex];
  }

  public moveForward(): void {
    this.attemptMove(1);
  }

  public moveBackward(): void {
    this.attemptMove(-1);
  }

  public turnLeft(): void {
    this.currentDirectionIndex = (this.currentDirectionIndex + 3) % 4;
    this.syncCameraAngle();
  }

  public turnRight(): void {
    this.currentDirectionIndex = (this.currentDirectionIndex + 1) % 4;
    this.syncCameraAngle();
  }

  /**
   * Delegates the interaction to the InteractionSystem
   */
  public interact(): void {
    const result = this.interactionSystem.interact();

    if (result.handled) {
      console.log(`[Interaction Success]: ${result.message}`);
      if (result.type == "container") {
        let inv = this.store.get("player.inventory.items");
        console.log("player inventory: ", inv);
        let keys = this.store.get("player.keyring");
        console.log("player keyring: ", keys);
      }
    } else {
      console.log(`[Interaction Failed]: ${result.message}`);
    }
  }

  private attemptMove(step: number): void {
    const currentX = Math.floor(this.camera.x);
    const currentY = Math.floor(this.camera.y);
    const dir = this.currentDirection;

    // Check the facing direction if stepping forward, or the opposite direction if stepping backward
    const checkDir = step > 0 ? dir : OPPOSITE_DIRECTIONS[dir];

    if (this.dungeon.canMove(currentX, currentY, checkDir)) {
      let dx = 0;
      let dy = 0;

      switch (dir) {
        case "east":
          dx = step;
          break;
        case "west":
          dx = -step;
          break;
        case "south":
          dy = step;
          break;
        case "north":
          dy = -step;
          break;
      }

      const nextX = this.camera.x + dx;
      const nextY = this.camera.y + dy;

      this.camera.x = nextX;
      this.camera.y = nextY;

      this.store.batch(ctx => {
        ctx.set("player.position.x", nextX);
        ctx.set("player.position.y", nextY);
      });
    }
  }

  private syncCameraAngle(): void {
    this.camera.angle = CARDINAL_ANGLES[this.currentDirection];
    this.store.set("player.facing", this.currentDirection);
  }
}
