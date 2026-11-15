// autoResources.ts
// Recursively discovers assets (Vite), builds the right Excalibur resource per extension,
// and keys each one by its camelCased relative path plus a short filename alias.
// Name collisions are auto-suffixed (goblin, goblin2, goblin3...) with a console warning.
import { ImageSource, Sound, FontSource, Resource, Loader, Loadable } from "excalibur";

type Kind = "image" | "sound" | "font" | "json" | "text";

const kindByExt: Record<string, Kind> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  mp3: "sound",
  wav: "sound",
  ogg: "sound",
  ttf: "font",
  otf: "font",
  woff: "font",
  woff2: "font",
  json: "json",
  txt: "text",
};

export type AssetMap = {
  image: Record<string, ImageSource>;
  sound: Record<string, Sound>;
  font: Record<string, FontSource>;
  json: Record<string, Resource<any>>;
  text: Record<string, Resource<string>>;
};

// "goblin_token" -> "goblinToken", "wall-2" -> "wall2"
const camel = (s: string) => s.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));

function build(kind: Kind, url: string, key: string): Loadable<any> {
  switch (kind) {
    case "image":
      return new ImageSource(url);
    case "sound":
      return new Sound(url);
    case "font":
      return new FontSource(url, key);
    case "json":
      return new Resource<any>(url, "json");
    case "text":
      return new Resource<string>(url, "text");
  }
}

// Returns base if free, otherwise base2, base3, ...
function uniqueKey(group: Record<string, unknown>, base: string): string {
  if (!group[base]) return base;
  let n = 2;
  while (group[`${base}${n}`]) n++;
  return `${base}${n}`;
}

/**
 * Build assets from a Vite glob result.
 * @param files  result of import.meta.glob(..., { eager: true, query: "?url", import: "default" })
 * @param root   the folder prefix to strip from keys, e.g. "./Assets/"
 *
 * For Assets/enemies/goblin_token.png:
 *   Assets.image["enemies/goblinToken"]  full relative path key
 *   Assets.image["goblinToken"]          short alias (suffixed to goblinToken2, 3... on collision)
 *
 * Shallower files claim plain names first, then deeper ones, in path order within a depth.
 * Same-folder collisions across extensions (a.png + a.jpg) are suffixed the same way.
 */
export function createAssets(files: Record<string, string>, root: string) {
  const assets: AssetMap = { image: {}, sound: {}, font: {}, json: {}, text: {} };
  const loader = new Loader();

  type Entry = { kind: Kind; url: string; path: string; short: string; full: string; depth: number };
  const entries: Entry[] = [];

  for (const [path, url] of Object.entries(files)) {
    const ext = path.split(".").pop()!.toLowerCase();
    const kind = kindByExt[ext];
    if (!kind) continue;

    const rel = path.startsWith(root) ? path.slice(root.length) : path.replace(/^\.\//, "");
    const segments = rel
      .replace(/\.[^.]+$/, "")
      .split("/")
      .filter(Boolean)
      .map(camel);
    entries.push({
      kind,
      url,
      path,
      short: segments[segments.length - 1],
      full: segments.join("/"),
      depth: segments.length,
    });
  }

  // Shallow files first so root-level assets get the plain names; sort is stable
  entries.sort((a, b) => a.depth - b.depth || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  // Pass 1: create resources under their full path keys
  const created: { entry: Entry; res: Loadable<any>; fullKey: string }[] = [];
  for (const entry of entries) {
    const group = assets[entry.kind] as Record<string, Loadable<any>>;
    const fullKey = uniqueKey(group, entry.full);
    if (fullKey !== entry.full) {
      console.warn(`[assets] ${entry.kind} key "${entry.full}" taken, "${entry.path}" registered as "${fullKey}"`);
    }
    const res = build(entry.kind, entry.url, entry.short);
    group[fullKey] = res;
    loader.addResource(res); // added once, even though it may get two keys
    created.push({ entry, res, fullKey });
  }

  // Pass 2: short aliases. Done after all full keys exist so nothing real gets displaced.
  for (const { entry, res, fullKey } of created) {
    if (fullKey === entry.short || entry.depth === 1) continue; // already reachable by short name
    const group = assets[entry.kind] as Record<string, Loadable<any>>;
    const shortKey = uniqueKey(group, entry.short);
    if (shortKey !== entry.short) {
      console.warn(
        `[assets] ${entry.kind} short name "${entry.short}" taken, "${entry.path}" aliased as "${shortKey}" (full key: "${fullKey}")`,
      );
    }
    group[shortKey] = res;
  }

  const pick = <T>(group: Record<string, T>, kind: string, key: string): T => {
    const r = group[key];
    if (!r) throw new Error(`[assets] no ${kind} "${key}". Available: ${Object.keys(group).join(", ")}`);
    return r;
  };

  return {
    Assets: assets,
    loader,
    getImage: (key: string) => pick(assets.image, "image", key),
    getSound: (key: string) => pick(assets.sound, "sound", key),
    getFont: (key: string) => pick(assets.font, "font", key),
    // Map of key -> HTMLImageElement; call after the loader has finished
    getLoadedTextures(): Map<string, HTMLImageElement> {
      const map = new Map<string, HTMLImageElement>();
      for (const [key, img] of Object.entries(assets.image)) map.set(key, img.image);
      return map;
    },
  };
}

// ---- Default instance for ./Assets --------------------------------------------------
// import.meta.glob needs a literal pattern (Vite resolves it at build time), so the glob
// itself must live at the call site. For another folder, call createAssets() the same way.
// Vite 5+: query/import. On Vite 4 use `{ eager: true, as: "url" }` instead.
//@ts-ignore
const files = import.meta.glob("./Assets/**/*.{png,jpg,jpeg,gif,webp,svg,mp3,wav,ogg,ttf,otf,woff,woff2,json,txt}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const { Assets, loader, getImage, getSound, getFont, getLoadedTextures } = createAssets(files, "./Assets/");
