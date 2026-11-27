// Content/WorldProps/index.ts
import { ContentRegistry } from "../ContentRegistry";
import { chest } from "./chest";
import { farmhouseBedProp } from "./farmhouse-bed";
import { stove } from "./stove";

export { farmhouseBedProp, stove };

export function registerWorldProps(registry: ContentRegistry): void {
  registry.registerWorldProp(farmhouseBedProp);
  registry.registerWorldProp(stove);
  registry.registerWorldProp(chest);
}
