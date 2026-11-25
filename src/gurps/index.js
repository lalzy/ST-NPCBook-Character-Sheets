// GURPS 4th Edition rules engine (pure, no DOM). Testable in Node.
// Public API — same exports the old calc.js had.

export { ATTRS, ATTR_COST, SECONDARY, SKILL_ATTRS, DIFFICULTIES, ENCUMBRANCE, WOUND_MULT, ABILITY_KINDS, ABILITY_USES, ABILITY_FX, ABILITY_AIMS, ABILITY_STATS, RESIST_ATTRS } from './rules.js';
export { abilityUse, isAttackAbility, abilityFx, abilityAim, fxText, abilityLevel, computeAbilities, abilityReachText } from './abilities.js';
export { defaultSheet, isBlankSheet, normalizeSheet } from './sheet.js';
export { basicLift, damage } from './strength.js';
export { relativeLevel, pointsForRelative } from './skills.js';
export { compute } from './compute.js';
export { xmlName, toXml } from './xml.js';
export { signed } from '../utils/number.js';
export { sheetFromLLM } from './llm.js';
export { parseDice, weaponDamage, parseDR, totalDR } from './dice.js';
export { combatActions } from './combat.js';
