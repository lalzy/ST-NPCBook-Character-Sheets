// Character sheet engine (pure, no DOM). Testable in Node.
// Every rule number comes from the user's rules config (../rules/ruleset.js), which ships empty.

export { ABILITY_KINDS, ABILITY_USES, ABILITY_FX, ABILITY_AIMS, ABILITY_STATS, resistAttrs } from './rules.js';
export { EMPTY_RULES, BLANK_TEMPLATE, normalizeRules, setRules, rules, rulesConfigured, attrBase, secondaryList, attrKeys, statLabel, role, defaultAttr, skillAttrs, difficulties, diffBase, skillsUsePoints, woundMult } from '../rules/ruleset.js';
export { evalFormula, formulaError } from '../rules/formula.js';
export { abilityUse, isAttackAbility, abilityFx, abilityAim, fxText, abilityLevel, untrainedLevel, computeAbilities, abilityReachText } from './abilities.js';
export { defaultSheet, isBlankSheet, normalizeSheet } from './sheet.js';
export { basicLift, damage } from './strength.js';
export { relativeLevel, pointsForRelative } from './skills.js';
export { compute } from './compute.js';
export { xmlName, toXml } from './xml.js';
export { signed } from '../utils/number.js';
export { sheetFromLLM } from './llm.js';
export { parseDice, weaponDamage, parseDR, totalDR } from './dice.js';
export { combatActions } from './combat.js';
