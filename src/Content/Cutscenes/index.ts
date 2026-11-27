import { ContentRegistry } from "../ContentRegistry";
import introJson from "./intro.json";
import goblinJson from "./goblin.json";
import newDungeonJson from "./newDungeon.json";
import combatMagicAttackJson from "./mgkAttack.json";
import farmerJson from "./farmer.json";
import cinematicJson from "./introCinematic.json";
import aunt_millie from "./auntmillie.json";

export function registerCutscenes(reg: ContentRegistry) {
  reg.registerCutscene(introJson);
  reg.registerCutscene(goblinJson);
  reg.registerCutscene(newDungeonJson);
  reg.registerCutscene(combatMagicAttackJson);
  reg.registerCutscene(farmerJson);
  reg.registerCutscene(cinematicJson);
  reg.registerCutscene(aunt_millie);
}
