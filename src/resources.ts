// resources.ts
import { ImageSource, Loader, SpriteSheet, Animation } from "excalibur";
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
import lightning from "./Assets/lightning.png"; // replace this
import fireball from "./Assets/fireball.png"; // replace this\
import fireballCharge from "./Assets/fireballCharge.png";
import cancel from "./Assets/cancel.png";
import meleeSSIMG from "./Assets/meleeSS.png";
import fireballBullet from "./Assets/fireball_bullet.png";
import fireballHit from "./Assets/Fire_Impact.png";
import lightningBullet from "./Assets/lightning_bullet.png";
import lightningHit from "./Assets/lightning_impact.png";
import lightingCharge from "./Assets/lightningCharge.png";
import farmer from "./Assets/npcFarmer.png"; // replace this
import farmerwife from "./Assets/npcFarmerWife.png";
import farmerAvatar from "./Assets/npcFarmerAvatar.png"; // replace this
import farmerWifeAvatar from "./Assets/npcFarmerWifeAvatar.png";
import openingCinematic from "./Assets/openCinematic.png"; // replace this
import wood_floor from "./Assets/wood-floor.png";
import wood_ceiling from "./Assets/wood-ceiling.png";
import wood_walls from "./Assets/wood-walls.png";
import wood_walls_1 from "./Assets/wood-walls_1.png";
import wood_walls_2 from "./Assets/wood-walls_2.png";
import farm_door from "./Assets/farm-door.png";
import farm_door_open from "./Assets/farm-door-open.png";
import bedroll from "./Assets/bedroll.png";
import farmhouse_bed from "./Assets/farmhouse-bed.png";
import farmhouse_bed_1 from "./Assets/farmhouse-bed-2.png";
import stove from "./Assets/stove.png";
import stove1 from "./Assets/stove_1.png";
import stove2 from "./Assets/stove_2.png";
import chest_open from "./Assets/chest_open.png";
import chest_closed from "./Assets/chest_closed.png";

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
  lightning: new ImageSource(lightning),
  fireball: new ImageSource(fireball),
  cancel: new ImageSource(cancel),
  meleeSS: new ImageSource(meleeSSIMG),
  fireballCharge: new ImageSource(fireballCharge),
  fireballBullet: new ImageSource(fireballBullet),
  fireballHit: new ImageSource(fireballHit),
  lightningBullet: new ImageSource(lightningBullet),
  lightningHit: new ImageSource(lightningHit),
  lightningCharge: new ImageSource(lightingCharge),
  farmer: new ImageSource(farmer),
  farmerAvatar: new ImageSource(farmerAvatar),
  openingCinematic: new ImageSource(openingCinematic),
  wood_floor: new ImageSource(wood_floor),
  wood_ceiling: new ImageSource(wood_ceiling),
  wood_walls: new ImageSource(wood_walls),
  wood_walls2: new ImageSource(wood_walls_2),
  wood_walls1: new ImageSource(wood_walls_1),
  farm_door: new ImageSource(farm_door),
  farm_door_open: new ImageSource(farm_door_open),
  bedroll: new ImageSource(bedroll),
  farmhouse_bed: new ImageSource(farmhouse_bed),
  farmhouse_bed_1: new ImageSource(farmhouse_bed_1),
  stove: new ImageSource(stove),
  stove1: new ImageSource(stove1),
  stove2: new ImageSource(stove2),
  chestOpen: new ImageSource(chest_open),
  chestClosed: new ImageSource(chest_closed),
  npcFarmerWife: new ImageSource(farmerwife),
  npocFarmerWifeAvatar: new ImageSource(farmerWifeAvatar),
};

export const loader = new Loader();

for (let res of Object.values(Resources)) {
  loader.addResource(res);
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

export const meleeSS = SpriteSheet.fromImageSource({
  image: Resources.meleeSS,
  grid: {
    rows: 2,
    columns: 8,
    spriteWidth: 104,
    spriteHeight: 64,
  },
});

export const attackSprite = iconSS.getSprite(15, 41);
export const magicSprite = iconSS.getSprite(15, 51);
export const itemSprite = iconSS.getSprite(14, 59);
export const defendSprite = iconSS.getSprite(7, 41);
export const throwSprite = Resources.throw.toSprite();
export const fleeSprite = iconSS.getSprite(1, 41);
export const lightningSprite = await iconSS.getSpriteAsImage(15, 51);
export const fireSprite = await iconSS.getSpriteAsImage(10, 47);

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
  map.set("lightning", Resources.lightning.image);
  map.set("fireball", Resources.fireball.image);
  map.set("cancel", Resources.cancel.image);
  map.set("npc_farmer", Resources.farmer.image);
  map.set("npc_farmer_avatar", Resources.farmerAvatar.image);
  map.set("npc_farmer_wife", Resources.npcFarmerWife.image);
  map.set("npc_farmer_wife_avatar", Resources.npocFarmerWifeAvatar.image);
  map.set("wood_floor", Resources.wood_floor.image);
  map.set("wood_ceiling", Resources.wood_ceiling.image);
  map.set("wood_walls", Resources.wood_walls.image);
  map.set("wood_walls_1", Resources.wood_walls.image);
  map.set("wood_walls_2", Resources.wood_walls.image);
  map.set("farm_door", Resources.farm_door.image);
  map.set("farm_door_open", Resources.farm_door_open.image);
  map.set("bedroll", Resources.bedroll.image);
  map.set("farmhouse_bed", Resources.farmhouse_bed.image);
  map.set("farmhouse_bed_1", Resources.farmhouse_bed_1.image);
  map.set("stove", Resources.stove.image);
  map.set("stove1", Resources.stove1.image);
  map.set("stove2", Resources.stove2.image);
  map.set("chestOpen", Resources.chestOpen.image);
  map.set("chestClosed", Resources.chestClosed.image);
  return map;
}
