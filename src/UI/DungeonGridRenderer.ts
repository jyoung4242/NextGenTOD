// Graphics/DungeonGridRenderer.ts
import { ScreenElement, Color, ExcaliburGraphicsContext, Vector } from "excalibur";
import { StateStore } from "../GameState";
import { GameState } from "../GameTypes";

export class DungeonGridRenderer extends ScreenElement {
  private readonly TILE_SIZE = 32;

  constructor(private readonly store: StateStore<GameState>) {
    super({ z: 0 });
  }

  protected _drawImage(ex: ExcaliburGraphicsContext, _x: number, _y: number): void {
    const dungeonState = this.store.get().dungeon;
    // Render floor tiles and wall boundaries using the same dungeon grid cells
    // used by DungeonRaycaster
  }
}
