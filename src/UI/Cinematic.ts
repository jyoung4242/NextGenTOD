import { StateStore } from "../GameState";
import { CinematicManifest, CinematicSlide, GameMode, GameState } from "../GameTypes";
import { DialogUI } from "./DialogUI";

// CinematicView.ts
import { ScreenElement, vec, Engine, Sprite, ImageSource, Scene, ActionsComponent, ActionSequence, Entity } from "excalibur";
import { CinematicImageGraphic } from "./CinimaticGraphic";
import { Resources } from "../resources";
import { DialogAction } from "../Lib/Managers/actions/DialogJSONaction";

export class CinematicView extends ScreenElement {
  private imageGraphic: CinematicImageGraphic;
  private speedPxPerSec: number = 0; // e.g. -25 for slow left drift, +25 for right drift
  private minX: number = 0;
  private maxX: number = 0;
  private bounceAtBounds: boolean = false;

  constructor(viewportWidth: number = 960, height: number = 390) {
    super({
      name: "CinematicView",
      pos: vec(0, 0),
      width: viewportWidth,
      height,
      z: 95,
    });

    this.imageGraphic = new CinematicImageGraphic(viewportWidth, height);
    this.graphics.use(this.imageGraphic);
    this.graphics.isVisible = false;
  }

  // Inside CinematicView
  public configureSlide(options: {
    sprite: Sprite | null;
    graphicWidth: number;
    graphicHeight: number;
    startX?: number;
    speedPxPerSec?: number;
    bounceAtBounds?: boolean;
  }): void {
    this.imageGraphic.setSprite(options.sprite, options.graphicWidth, options.graphicHeight);

    this.minX = Math.min(0, this.width - options.graphicWidth);
    this.maxX = Math.max(0, this.width - options.graphicWidth);
    this.speedPxPerSec = options.speedPxPerSec ?? 0;
    this.bounceAtBounds = options.bounceAtBounds ?? false;

    const initialX = options.startX ?? (this.speedPxPerSec < 0 ? 0 : this.minX);
    this.pos.x = Math.max(this.minX, Math.min(this.maxX, initialX));
    this.pos.y = 0;
  }

  private resolveImageSource(slide: CinematicSlide): ImageSource | null {
    if (slide.image) return slide.image;
    if (!slide.imageKey) return null;

    const candidate = (Resources as Record<string, unknown>)[slide.imageKey];
    if (candidate && typeof (candidate as ImageSource).toSprite === "function") {
      return candidate as ImageSource;
    }

    console.warn(`[CinematicView] Could not resolve preloaded ImageSource for key '${slide.imageKey}'`);
    return null;
  }

  public setSlide(slide: CinematicSlide): void {
    const imageSource = this.resolveImageSource(slide);
    const sprite = slide.sprite ?? (imageSource ? imageSource.toSprite() : null);

    const naturalWidth = imageSource?.width || imageSource?.image?.naturalWidth || this.width;
    const naturalHeight = imageSource?.height || imageSource?.image?.naturalHeight || this.height;

    const graphicWidth = slide.graphicWidth ?? naturalWidth;
    const graphicHeight = slide.graphicHeight ?? naturalHeight;

    let speedPxPerSec = slide.speedPxPerSec ?? 0;
    if (slide.speedPxPerSec === undefined && slide.pan) {
      if (slide.pan === "left-to-right") speedPxPerSec = -25;
      if (slide.pan === "right-to-left") speedPxPerSec = 25;
    }

    this.configureSlide({
      sprite,
      graphicWidth,
      graphicHeight,
      startX: slide.startX,
      speedPxPerSec,
      bounceAtBounds: slide.bounceAtBounds ?? false,
    });
  }

  public show(): void {
    this.graphics.isVisible = true;
  }

  public hide(): void {
    this.graphics.isVisible = false;
    this.speedPxPerSec = 0;
  }

  public override onPreUpdate(_engine: Engine, delta: number): void {
    if (!this.graphics.isVisible || this.speedPxPerSec === 0) return;

    const nextX = this.pos.x + this.speedPxPerSec * (delta / 1000);

    if (nextX < this.minX) {
      this.pos.x = this.minX;
      if (this.bounceAtBounds) this.speedPxPerSec *= -1;
    } else if (nextX > this.maxX) {
      this.pos.x = this.maxX;
      if (this.bounceAtBounds) this.speedPxPerSec *= -1;
    } else {
      this.pos.x = nextX;
    }
  }
}

class CinematicDirector extends Entity {
  public readonly actions = new ActionsComponent();

  constructor() {
    super();
    this.addComponent(this.actions);
  }
}

export class CinematicController {
  private readonly director = new CinematicDirector();
  private readonly manifests = new Map<string, CinematicManifest>();
  private activeSequence: ActionSequence | null = null;
  private isPlaying = false;

  constructor(
    private readonly scene: Scene,
    private readonly view: CinematicView,
    private readonly dialogUI: DialogUI,
    private readonly getState: () => StateStore<GameState>,
  ) {
    this.scene.add(this.director);
  }

  public registerManifest(manifest: CinematicManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  public async playById(cinematicId: string): Promise<void> {
    const manifest = this.manifests.get(cinematicId);
    if (!manifest) {
      console.warn(`[CinematicController] Cinematic '${cinematicId}' not registered.`);
      return;
    }
    await this.play(manifest);
  }

  public async play(manifest: CinematicManifest): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;

    this.getState().update("game", g => ({ ...g, mode: "paused" as GameMode }));
    this.view.show();

    console.log(`[CinematicController] Starting cinematic: ${manifest.id}`);
    try {
      for (const slide of manifest.slides) {
        if (!this.isPlaying) break;

        this.view.setSlide(slide);
        await this.runSlideStep(slide);
      }

      if (this.isPlaying && manifest.onCompleteSetFlag) {
        this.getState().update("storypoints", points => ({
          ...points,
          [manifest.onCompleteSetFlag!]: true,
        }));
      }
    } finally {
      this.finalize();
    }
  }

  public cancel(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.director.actions.clearActions();
    this.activeSequence = null;
    this.dialogUI.hide();
    this.finalize();
  }

  public isActive(): boolean {
    return this.isPlaying;
  }

  private async runSlideStep(slide: CinematicSlide): Promise<void> {
    if (slide.dialogPath) {
      await this.director.actions.runAction(new DialogAction(this.scene, this.dialogUI, slide.dialogPath)).toPromise();
      return;
    }

    const durationMs = (slide.durationSec ?? 4) * 1000;
    await this.director.actions.delay(durationMs).toPromise();
  }

  private finalize(): void {
    this.activeSequence = null;
    this.isPlaying = false;
    this.view.hide();
    this.getState().update("game", g => ({ ...g, mode: "playing" as GameMode }));
  }
}
