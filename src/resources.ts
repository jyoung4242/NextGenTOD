// resources.ts
import { ImageSource, Loader, SpriteSheet } from "excalibur";
import goblin from "./Assets/goblinsmall.png"; // replace this
import goblinLarge from "./Assets/goblin_bb.png"; // replace this
import goblinToken from "./Assets/goblin_token.png"; // replace this
import dirt from "./Assets/dirt.png"; // replace this
import stone from "./Assets/stone.png"; // replace this
import ceiling from "./Assets/stone_roof.png"; // replace this
import door from "./Assets/door.png"; // replace this
import key from "./Assets/KeyMaster.png"; // replace this
import potion from "./Assets/potion.png"; // replace this
import playertoken from "./Assets/player_token.png"; // replace this
import icons from "./Assets/64x64.png";
import throwIcon from "./Assets/throw.png";
import portal from "./Assets/portal.png";
import portalISO from "./Assets/portaliso.png";
import torchSS from "./Assets/torch.png";
import gate from "./Assets/gate.png"; // replace this
import gateOpen from "./Assets/gate_open.png"; // replace this
import doorOpen from "./Assets/door_open.png"; // replace this
import stone2 from "./Assets/wall2.png";
import stone3 from "./Assets/wall3.png";
import stone4 from "./Assets/wall4.png";

export const Resources = {
  goblin: new ImageSource(goblin),
  goblinLarge: new ImageSource(goblinLarge),
  dirt: new ImageSource(dirt),
  stone: new ImageSource(stone),
  ceiling: new ImageSource(ceiling),
  door: new ImageSource(door),
  key: new ImageSource(key),
  potion: new ImageSource(potion),
  goblinToken: new ImageSource(goblinToken),
  playerToken: new ImageSource(playertoken),
  icons: new ImageSource(icons),
  throw: new ImageSource(throwIcon),
  portal: new ImageSource(portal),
  portalISO: new ImageSource(portalISO),
  torchSS: new ImageSource(torchSS),
  gate: new ImageSource(gate),
  gateOpen: new ImageSource(gateOpen),
  doorOpen: new ImageSource(doorOpen),
  stone2: new ImageSource(stone2),
  stone3: new ImageSource(stone3),
  stone4: new ImageSource(stone4),
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
  map.set("goblinToken", Resources.goblinToken.image);
  map.set("playerToken", Resources.playerToken.image);
  map.set("portal", Resources.portal.image);
  map.set("portaliso", Resources.portalISO.image);
  map.set("torch", Resources.torchSS.image);
  map.set("gate", Resources.gate.image);
  map.set("gate_open", Resources.gateOpen.image);
  map.set("door_open", Resources.doorOpen.image);
  map.set("stone2", Resources.stone2.image);
  map.set("stone3", Resources.stone3.image);
  map.set("stone4", Resources.stone4.image);
  return map;
}

export const iconSS = SpriteSheet.fromImageSource({
  image: Resources.icons,
  grid: {
    rows: 137,
    columns: 16,
    spriteWidth: 64,
    spriteHeight: 64,
  },
});

export const attackSprite = iconSS.getSprite(15, 41);
export const magicSprite = iconSS.getSprite(15, 51);
export const itemSprite = iconSS.getSprite(14, 59);
export const defendSprite = iconSS.getSprite(7, 41);
export const throwSprite = Resources.throw.toSprite();
export const fleeSprite = iconSS.getSprite(1, 41);
