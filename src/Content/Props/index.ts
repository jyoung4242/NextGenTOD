// Content/WorldProps/index.ts
import { ContentRegistry } from "../ContentRegistry";
import { farmhouseBedProp } from "./farmhouse-bed";

export { farmhouseBedProp };

export function registerWorldProps(registry: ContentRegistry): void {
  registry.registerWorldProp(farmhouseBedProp);
}
