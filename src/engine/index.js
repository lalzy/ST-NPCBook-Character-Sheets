// Character sheet engine (pure, no DOM). Testable in Node.
// Every rule number comes from the user's rules config (../rules/ruleset.js), which ships empty.

export { ABILITY_KINDS, ABILITY_USES, ABILITY_FX, ABILITY_AIMS, ABILITY_STATS, DICE_FX, SAVE_RESULTS, resistAttrs } from './rules.js';
export { macrosIn, sheetMacros } from './macros.js';
export { EMPTY_RULES, BLANK_TEMPLATE, normalizeRules, setRules, rules, skillsUsePoints, diffBase, rulesConfigured, attrBase, secondaryList, attrKeys, statLabel, role, defaultAttr, skillAttrs, woundMult } from '../rules/ruleset.js';
export { evalFormula, formulaError } from '../rules/formula.js';
export { abilityUse, isAttackAbility, abilityFx, abilityAim, fxText, abilityLevel, untrainedLevel, computeAbilities, abilityReachText, resourceNames, resourceOf } from './abilities.js';
export { defaultSheet, isBlankSheet, normalizeSheet } from './sheet.js';
export { basicLift, damage } from './strength.js';
export { compute, hpRollInfo } from './compute.js';
export { xmlName, toXml } from './xml.js';
export { signed } from '../utils/number.js';
export { sheetFromLLM } from './llm.js';
export { parseDice, weaponDamage, parseDR, totalDR, armorItem, armorCovers, armorList, gearBonuses } from './dice.js';
export { relativeLevel, pointsForRelative } from './skills.js';
export { combatActions, weaponSkill } from './combat.js';
export { BLOCK_TYPES, DEFENSE_KINDS, MOD_WHEN, SLOT_SUGGESTIONS, NEW_BLOCK, legacyBlocks, itemBlocks, isCarried, isEquipped, modTargets, modTargetLabel, slotList, ammoOf, chargesOf, spendUse, ammoCandidates, poolCostsOf, consumablePools, expandFormulas } from './items.js';
