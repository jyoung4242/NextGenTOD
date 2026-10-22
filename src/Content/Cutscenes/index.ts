import { ContentRegistry } from "../ContentRegistry";
import introJson from "./intro.json";
import goblinJson from "./goblin.json";
import newDungeonJson from "./newDungeon.json";

export function registerCutscenes(reg: ContentRegistry) {
  reg.registerCutscene(introJson);
  reg.registerCutscene(goblinJson);
  reg.registerCutscene(newDungeonJson);
}
