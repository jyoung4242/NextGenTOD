// Content/SpellRegistry.ts
import { SpellDefinition } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const SPELL_DEFINITIONS: SpellDefinition[] = [
  {
    id: "fireball",
    name: "Fireball",
    category: "blackMagic",
    minLevelRequirement: 1,
    targetMode: "direct_enemy",
    manaCost: 15,
    basePower: 25,
    range: 4,
    description: "Hurls a blazing sphere of fire at a single enemy.",
  },
  {
    id: "heal",
    name: "Heal",
    category: "whiteMagic",
    minLevelRequirement: 1,
    targetMode: "self",
    manaCost: 20,
    basePower: 30,
    range: 0,
    description: "Restores minor health to the caster.",
  },
  {
    id: "inferno",
    name: "Inferno",
    category: "blackMagic",
    minLevelRequirement: 5,
    targetMode: "aoe",
    manaCost: 45,
    basePower: 40,
    range: 3,
    description: "Engulfs an area in destructive flames, damaging all nearby foes.",
  },
  {
    id: "group_heal",
    name: "Group Heal",
    category: "whiteMagic",
    minLevelRequirement: 4,
    targetMode: "party",
    manaCost: 35,
    basePower: 20,
    range: 0,
    description: "Bathes the party in soothing light, restoring health to all allies.",
  },
];

export function registerSpells(registry: ContentRegistry): void {
  // If you add a registry map for spells in ContentRegistry, or register them into skills/spells:
  SPELL_DEFINITIONS.forEach(spell => {
    // Optional: Register as part of content or a dedicated spells map
    registry.registerSpell(spell);
  });
}
