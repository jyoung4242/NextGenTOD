import { SkillDefinition } from "../../GameTypes";
import { ContentRegistry } from "../ContentRegistry";

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  // Weapons
  { id: "oneHanded", name: "One-Handed", category: "combat", supportedCharacteristics: ["hp", "stam"], basePowerMultiplier: 1.5 },
  { id: "twoHanded", name: "Two-Handed", category: "combat", supportedCharacteristics: ["hp", "stam"], basePowerMultiplier: 2.0 },
  { id: "ranged", name: "Ranged", category: "combat", supportedCharacteristics: ["agil", "per", "stam"], basePowerMultiplier: 1.4 },
  { id: "poleArm", name: "Polearm", category: "combat", supportedCharacteristics: ["agil", "stam", "per"], basePowerMultiplier: 1.6 },
  { id: "unarmed", name: "Unarmed", category: "combat", supportedCharacteristics: ["hp", "stam", "agil"], basePowerMultiplier: 1.2 },
  { id: "throw", name: "Throw", category: "combat", supportedCharacteristics: ["agil", "per"], basePowerMultiplier: 1.2 },

  // Defense & Armor
  { id: "defense", name: "Defense", category: "defense", supportedCharacteristics: ["hp", "stam", "per"], basePowerMultiplier: 1.0 },
  { id: "shield", name: "Shield", category: "defense", supportedCharacteristics: ["stam", "agil"], basePowerMultiplier: 1.3 },
  { id: "armorLight", name: "Light Armor", category: "armor", supportedCharacteristics: ["stam", "agil"], basePowerMultiplier: 1.1 },
  { id: "armorHeavy", name: "Heavy Armor", category: "armor", supportedCharacteristics: ["stam", "hp"], basePowerMultiplier: 1.5 },

  // Magic
  { id: "blackMagic", name: "Black Magic", category: "magic", supportedCharacteristics: ["wisdom", "hp"], basePowerMultiplier: 2.2 },
  { id: "whiteMagic", name: "White Magic", category: "magic", supportedCharacteristics: ["stam", "wisdom"], basePowerMultiplier: 2.0 },
  { id: "chaosMagic", name: "Chaos Magic", category: "magic", supportedCharacteristics: ["wisdom", "per"], basePowerMultiplier: 2.5 },
];

export function registerSkills(registry: ContentRegistry): void {
  SKILL_DEFINITIONS.forEach(skill => registry.registerSkill(skill));
}
