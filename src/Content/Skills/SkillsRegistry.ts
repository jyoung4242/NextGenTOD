// Content/SkillRegistry.ts
import { SkillDefinition } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    id: "oneHanded",
    name: "One-Handed",
    category: "oneHanded",
    staminaCost: 5,
    manaCost: 0,
    basePower: 6,
    targetType: "single_enemy",
    range: 1,
  },
  {
    id: "block",
    name: "Block",
    category: "block",
    staminaCost: 0,
    manaCost: 0,
    basePower: 0,
    targetType: "self",
    range: 0,
  },
  {
    id: "destruction",
    name: "Destruction Magic",
    category: "destruction",
    staminaCost: 0,
    manaCost: 15,
    basePower: 20,
    targetType: "single_enemy",
    range: 4,
  },
  {
    id: "restoration",
    name: "Restoration Magic",
    category: "restoration",
    staminaCost: 0,
    manaCost: 20,
    basePower: 25,
    targetType: "self",
    range: 0,
  },
];

export function registerSkills(registry: ContentRegistry): void {
  SKILL_DEFINITIONS.forEach(skill => registry.registerSkill(skill));
}
