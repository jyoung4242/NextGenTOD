import { Color, ExcaliburGraphicsContext, Graphic, Vector } from "excalibur";
import { DungeonDefinition, DungeonCamera, DungeonState } from "../GameTypes";
import { DungeonRaycaster } from "./DungeonRaycaster";

export interface DungeonViewportGraphicOptions {
  dungeon: DungeonDefinition;
  getState: () => DungeonState;
  camera: DungeonCamera;
  width: number;
  height: number;
}

export class DungeonViewportGraphic extends Graphic {
  private options: DungeonViewportGraphicOptions;
  private readonly dungeon: DungeonDefinition;
  private readonly getState: () => DungeonState;
  private readonly camera: DungeonCamera;
  private readonly raycaster: DungeonRaycaster;

  public constructor(options: DungeonViewportGraphicOptions) {
    super({
      width: options.width,
      height: options.height,
    });
    this.options = options;
    this.dungeon = options.dungeon;
    this.getState = options.getState;
    this.camera = options.camera;
    this.raycaster = new DungeonRaycaster();
  }

  public clone(): DungeonViewportGraphic {
    return new DungeonViewportGraphic(this.options);
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, x: number, y: number): void {
    const width = this.width;
    const height = this.height;

    // Fetch live state on every draw frame!
    const currentState = this.getState();

    // Ceiling & Floor
    ex.drawRectangle(new Vector(0, 0), width, height / 2, Color.fromHex("#202020"));
    ex.drawRectangle(new Vector(0, height / 2), width, height / 2, Color.fromHex("#101010"));

    const projectionPlane = width / 2 / Math.tan(this.camera.fov / 2);

    for (let screenX = 0; screenX < width; screenX++) {
      const normalizedX = (screenX + 0.5) / width;
      const rayAngle = this.camera.angle - this.camera.fov / 2 + normalizedX * this.camera.fov;

      // Pass LIVE state to raycaster!
      const hit = this.raycaster.cast(this.dungeon.grid, currentState, this.camera, rayAngle);

      if (!hit) continue;

      const correctedDistance = hit.distance * Math.cos(rayAngle - this.camera.angle);
      if (correctedDistance <= 0) continue;

      const wallHeight = projectionPlane / correctedDistance;
      const wallTop = (height - wallHeight) / 2;

      let color: Color;

      if (hit.wall.type === "door") {
        const doorState = currentState.doors[hit.wall.doorId];
        if (doorState?.locked) {
          color = Color.fromHex("#a02020"); // Crimson Red for Locked Doors
        } else {
          color = Color.fromHex("#8b5a2b"); // Wood Brown for Closed Unlocked Doors
        }
      } else {
        color = hit.side === "north" || hit.side === "south" ? Color.fromHex("#888888") : Color.fromHex("#666666");
      }

      ex.drawRectangle(new Vector(screenX, wallTop), 1, wallHeight, color);
    }
  }
}
