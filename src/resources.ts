// resources.ts
import { ImageSource, Loader } from "excalibur";
import goblin from "./Assets/goblinsmall.png"; // replace this
import goblinLarge from "./Assets/goblin_bb.png"; // replace this
import dirt from "./Assets/dirt.png"; // replace this
import stone from "./Assets/stone.png"; // replace this
import ceiling from "./Assets/stone_roof.png"; // replace this
import door from "./Assets/door.png"; // replace this
import key from "./Assets/KeyMaster.png"; // replace this
import potion from "./Assets/potion.png"; // replace this

export const Resources = {
  goblin: new ImageSource(goblin),
  goblinLarge: new ImageSource(goblinLarge),
  dirt: new ImageSource(dirt),
  stone: new ImageSource(stone),
  ceiling: new ImageSource(ceiling),
  door: new ImageSource(door),
  key: new ImageSource(key),
  potion: new ImageSource(potion),
};

export const loader = new Loader();

for (let res of Object.values(Resources)) {
  loader.addResource(res);
}

// Map texture keys to preloaded HTMLImageElements for standard 2D Canvas rendering
export function getLoadedTextures(): Map<string, HTMLImageElement> {
  const map = new Map<string, HTMLImageElement>();
  map.set("stone", Resources.stone.image);
  map.set("dirt", Resources.dirt.image);
  map.set("ceiling", Resources.ceiling.image);
  map.set("goblin", Resources.goblin.image);
  map.set("door", Resources.door.image);
  map.set("key", Resources.key.image);
  map.set("potion", Resources.potion.image);
  map.set("goblinLarge", Resources.goblinLarge.image);
  return map;
}
