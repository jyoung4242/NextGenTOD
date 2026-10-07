// resources.ts
import { ImageSource, Loader } from "excalibur";
import goblin from "./Assets/goblinsmall.png"; // replace this

export const Resources = {
  goblin: new ImageSource(goblin),
};

export const loader = new Loader();

for (let res of Object.values(Resources)) {
  loader.addResource(res);
}
