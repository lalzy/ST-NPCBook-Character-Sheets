// Sheet vocabulary (no rule numbers). Costs, tables and formulas live in the user's rules config (../rules/ruleset.js).

import { skillAttrs } from '../rules/ruleset.js';

// Abilities: spells, psionics, powers… (the kind is free text, these are suggestions)
export const ABILITY_KINDS = ['spell', 'psionic', 'power', 'prayer', 'chi', 'innate', 'tech'];
/** How an ability is used: ranged / melee attack, or a utility roll (no attack). */
export const ABILITY_USES = ['ranged', 'melee', 'utility'];
/**
 * What an ability does when it works (applied by Combat Mode):
 * damage · heal (HP) · fp (restore FP) · buff / debuff (a modifier for some turns) · stun · disarm ·
 * none (no automatic effect: the roll is made, and the narration or the user decides what happens).
 */
export const ABILITY_FX = ['damage', 'heal', 'fp', 'buff', 'debuff', 'stun', 'disarm', 'none'];
/** Who an ability may be used on. */
export const ABILITY_AIMS = ['enemy', 'ally', 'self', 'any'];
/** What a buff / debuff modifies. 'all' = attack, defense, skill and resistance rolls. */
export const ABILITY_STATS = ['attack', 'defense', 'skill', 'resist', 'dr', 'move', 'all'];
/** What a target can resist with (opposed roll against the caster): the attributes and the rules' secondary keys. '' = not resisted. */
export const resistAttrs = () => ['', ...skillAttrs()];
