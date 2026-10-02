// Actors/DungeonPlayer.ts
import { StateStore } from "../GameState";
import { GameState, DungeonCamera, Direction } from "../GameTypes";
import { Dungeon } from "../Lib/Managers/DungeonManager";
import { Signal } from "../Lib/Signals";
import { EncounterTriggerSystem } from "../Lib/Systems/EncounterTriggerSystem";
import { InteractionSystem } from "../Lib/Systems/InteractionSystem";
import { ProximitySystem } from "../Lib/Systems/ProxSystem";

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
  mmdirtySignal: Signal = new Signal("minimap:dirty");
  dungeonDirtyFlag: Signal = new Signal("dungeon:draw:dirty");

  constructor(
    private readonly store: StateStore<GameState>,
    private readonly dungeon: Dungeon,
    private readonly camera: DungeonCamera,
    private readonly interactionSystem: InteractionSystem,
    private readonly proximitySystem: ProximitySystem,
    private readonly encounterTriggerSystem: EncounterTriggerSystem,
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
    console.log("move forward");
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

  updateGraphics() {
    this.mmdirtySignal.send();
    this.dungeonDirtyFlag.send();
  }

  /**
   * Delegates the interaction to the InteractionSystem
   */
  public interact(): void {
    const result = this.interactionSystem.interact();
    this.updateGraphics();
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

  /**
   * Evaluates proximity rules and triggers encounters upon stepping onto a new tile
   */
  private onPlayerStep(): void {
    const { alertedEnemies, triggeredEncounter } = this.proximitySystem.updateProximity();

    if (alertedEnemies.length > 0) {
      console.log(`[Proximity]: Enemies alerted: ${alertedEnemies.join(", ")}`);
    }

    if (triggeredEncounter) {
      console.log(`[Proximity]: Encounter triggered with ${triggeredEncounter}!`);
      this.encounterTriggerSystem.checkAndTriggerEncounter(triggeredEncounter);
    }
  }

  private attemptMove(step: number): void {
    const currentX = Math.floor(this.camera.x);
    const currentY = Math.floor(this.camera.y);
    const dir = this.currentDirection;

    // Check the facing direction if stepping forward, or the opposite direction if stepping backward
    const checkDir = step > 0 ? dir : OPPOSITE_DIRECTIONS[dir];
    console.log("attempting move");
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
      console.log("camera update: ", this.camera.x, this.camera.y);

      this.store.batch(ctx => {
        console.log("setting state");

        ctx.set("player.position.x", nextX);
        ctx.set("player.position.y", nextY);
      });

      // --- STEP ACTION TICK ---
      this.updateGraphics();
      this.onPlayerStep();
    }
  }

  private syncCameraAngle(): void {
    this.camera.angle = CARDINAL_ANGLES[this.currentDirection];
    this.store.set("player.facing", this.currentDirection);
  }
}
