// SaveManager.ts

import type { Engine, Scene } from "excalibur";
import type { StateStore } from "../../GameState";
import type { GameState } from "../../GameTypes";

// ─── Types ───────────────────────────────────────────────────────────────────

export const AUTOSAVE_SLOT = "autosave";

export interface SaveEnvelope {
  version: number;
  savedAt: number; // epoch ms
  sceneKey: string | null; // scene the player was in when saved
  state: GameState;
}

export interface SaveSlotInfo {
  slot: string;
  savedAt: number;
  sceneKey: string | null;
  playerName: string;
  playerLevel: number;
}

export interface SaveManagerOptions {
  /** Prefix for localStorage keys. Change per game to avoid collisions. */
  keyPrefix?: string;
  /** Bump when GameState shape changes, and add a migration below. */
  version?: number;
  /** Return false to skip autosaving for a scene (e.g. the title screen). */
  shouldAutosave?: (sceneKey: string, state: Readonly<GameState>) => boolean;
  /** version N -> N+1 migrations, applied in order on load. */
  migrations?: Record<number, (oldState: any) => any>;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

// ─── SaveManager ─────────────────────────────────────────────────────────────

export class SaveManager {
  private readonly prefix: string;
  private readonly version: number;
  private readonly shouldAutosave: NonNullable<SaveManagerOptions["shouldAutosave"]>;
  private readonly migrations: Record<number, (oldState: any) => any>;
  private _currentSceneKey: string | null = null;

  constructor(
    private readonly store: StateStore<GameState>,
    options: SaveManagerOptions = {},
  ) {
    this.prefix = options.keyPrefix ?? "game:save:";
    this.version = options.version ?? 1;
    // Default: never autosave from the title screen, or we'd overwrite a real save with a blank state.
    this.shouldAutosave = options.shouldAutosave ?? ((_key, state) => state.game.mode !== "title");
    this.migrations = options.migrations ?? {};
  }

  // ── Core save / load ──────────────────────────────────────────────────────

  save(slot: string, sceneKey: string | null = this._currentSceneKey): SaveResult {
    const envelope: SaveEnvelope = {
      version: this.version,
      savedAt: Date.now(),
      sceneKey,
      state: this.store.get() as GameState,
    };
    try {
      console.log("Saving to slot", slot, "sceneKey", sceneKey, "state", envelope.state);
      localStorage.setItem(this.keyFor(slot), JSON.stringify(envelope));
      return { ok: true };
    } catch (err) {
      // Quota exceeded, private mode, storage disabled, etc.
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /** Restores state into the store. Returns the saved scene key so you can navigate to it. */
  load(slot: string): { ok: true; sceneKey: string | null } | { ok: false; error: string } {
    const envelope = this.read(slot);
    if (!envelope) return { ok: false, error: `No valid save in slot "${slot}"` };

    // reset() clears stale keys in records (dungeon.registry, quests.active, storypoints),
    // then patch() lays the saved data over the defaults. Arrays are replaced wholesale by deepMerge.
    this.store.batch(ctx => {
      this.store.reset(); // emits its own events; batch just groups the patch
      ctx.patch(envelope.state as any);
    });
    this._currentSceneKey = envelope.sceneKey;
    return { ok: true, sceneKey: envelope.sceneKey };
  }

  /** Load a slot and jump to the scene it was saved in (falls back to `fallbackScene`). */
  async loadAndGo(engine: Engine, slot: string, fallbackScene: string): Promise<SaveResult> {
    const result = this.load(slot);
    if (!result.ok) return result;
    const target = result.sceneKey && result.sceneKey in engine.scenes ? result.sceneKey : fallbackScene;
    // await engine.goToScene(target);
    return { ok: true };
  }

  // ── Slot management ───────────────────────────────────────────────────────

  has(slot: string): boolean {
    return this.read(slot) !== null;
  }

  delete(slot: string): void {
    try {
      localStorage.removeItem(this.keyFor(slot));
    } catch {
      /* ignore */
    }
  }

  /** Lightweight metadata for building Load Game UI. Newest first. */
  list(): SaveSlotInfo[] {
    const infos: SaveSlotInfo[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(this.prefix)) continue;
        const slot = key.slice(this.prefix.length);
        const env = this.read(slot);
        if (!env) continue;
        infos.push({
          slot,
          savedAt: env.savedAt,
          sceneKey: env.sceneKey,
          playerName: env.state.player.name,
          playerLevel: env.state.progression.level,
        });
      }
    } catch {
      /* storage unavailable */
    }
    return infos.sort((a, b) => b.savedAt - a.savedAt);
  }

  // ── Autosave on scene enter ───────────────────────────────────────────────

  /** Autosave whenever this scene is activated. Returns an unsubscribe function. */
  attachScene(sceneKey: string, scene: Scene): () => void {
    const handler = () => {
      console.log(`[SaveManager] Scene "${sceneKey}" activated, checking autosave...`);
      this._currentSceneKey = sceneKey;
      if (this.shouldAutosave(sceneKey, this.store.get())) {
        const res = this.save(AUTOSAVE_SLOT, sceneKey);
        if (!res.ok) console.warn(`[SaveManager] Autosave failed: ${res.error}`);
      }
    };
    scene.on("activate", handler);
    return () => scene.off("activate", handler);
  }

  /**
   * Attach to every scene currently registered on the engine.
   * Call after all engine.addScene(...) calls (or call attachScene yourself for late-added scenes).
   */
  attachEngine(engine: Engine): () => void {
    const unsubs = Object.entries(engine.scenes).map(([key, scene]) => this.attachScene(key, scene as Scene));
    return () => unsubs.forEach(u => u());
  }

  get currentSceneKey(): string | null {
    return this._currentSceneKey;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private keyFor(slot: string): string {
    return `${this.prefix}${slot}`;
  }

  private read(slot: string): SaveEnvelope | null {
    try {
      const raw = localStorage.getItem(this.keyFor(slot));
      if (!raw) return null;
      const env = JSON.parse(raw) as SaveEnvelope;
      if (typeof env?.version !== "number" || !env.state) return null;
      if (env.version > this.version) return null; // save from a newer build

      let state: any = env.state;
      for (let v = env.version; v < this.version; v++) {
        const migrate = this.migrations[v];
        if (!migrate) return null; // can't upgrade
        state = migrate(state);
      }
      return { ...env, version: this.version, state };
    } catch {
      return null; // corrupt JSON
    }
  }
}
