// GURPS 4th Edition rule constants (pure data).

export const ATTRS = ['ST', 'DX', 'IQ', 'HT'];
export const ATTR_COST = { ST: 10, DX: 20, IQ: 20, HT: 10 };

// Secondary characteristics: stored as a delta from their base. cost = points per +1 step.
export const SECONDARY = [
    { key: 'HP', label: 'HP', cost: 2 },
    { key: 'FP', label: 'FP', cost: 3 },
    { key: 'Will', label: 'Will', cost: 5 },
    { key: 'Fright', label: 'Fright', cost: 2 },
    { key: 'Per', label: 'Per', cost: 5 },
    { key: 'Vision', label: 'Vision', cost: 2 },
    { key: 'Hearing', label: 'Hearing', cost: 2 },
    { key: 'TasteSmell', label: 'Taste/Smell', cost: 2 },
    { key: 'Touch', label: 'Touch', cost: 2 },
    { key: 'BasicSpeed', label: 'Basic Speed', cost: 5, step: 0.25 },
    { key: 'BasicMove', label: 'Basic Move', cost: 5 },
];

export const SKILL_ATTRS = ['ST', 'DX', 'IQ', 'HT', 'Will', 'Per'];
export const DIFFICULTIES = ['E', 'A', 'H', 'VH'];
export const DIFF_BASE = { E: 0, A: -1, H: -2, VH: -3 };

export const ENCUMBRANCE = [
    { name: 'None', mult: 1, move: 1, dodge: 0 },
    { name: 'Light', mult: 2, move: 0.8, dodge: -1 },
    { name: 'Medium', mult: 3, move: 0.6, dodge: -2 },
    { name: 'Heavy', mult: 6, move: 0.4, dodge: -3 },
    { name: 'X-Heavy', mult: 10, move: 0.2, dodge: -4 },
];

// Combat
export const WOUND_MULT = { cut: 1.5, imp: 2, 'pi-': 0.5, pi: 1, 'pi+': 1.5, 'pi++': 2, cr: 1, burn: 1, cor: 1, tox: 1, fat: 1, tbb: 1 };
export const DMG_TYPES = ['pi++', 'pi+', 'pi-', 'pi', 'cut', 'imp', 'cr', 'burn', 'cor', 'tox', 'fat', 'tbb'];
export const UNARMED_SKILLS = ['Karate', 'Boxing', 'Brawling'];

// Abilities: spells, psionics, powers… (the kind is free text, these are suggestions)
export const ABILITY_KINDS = ['spell', 'psionic', 'power', 'prayer', 'chi', 'innate', 'tech'];
/** How an ability is used: ranged / melee attack, or a utility roll (no attack). */
export const ABILITY_USES = ['ranged', 'melee', 'utility'];
/**
 * What an ability does when it works (applied by GURPS Combat):
 * damage · heal (HP) · fp (restore FP) · buff / debuff (a modifier for some turns) · stun · disarm ·
 * none (no automatic effect: the roll is made, and the narration or the user decides what happens).
 */
export const ABILITY_FX = ['damage', 'heal', 'fp', 'buff', 'debuff', 'stun', 'disarm', 'none'];
/** Who an ability may be used on. */
export const ABILITY_AIMS = ['enemy', 'ally', 'self', 'any'];
/** What a buff / debuff modifies. 'all' = attack, defense, skill and resistance rolls. */
export const ABILITY_STATS = ['attack', 'defense', 'skill', 'resist', 'dr', 'move', 'all'];
/** Attributes a target can resist with (quick contest against the caster). '' = not resisted. */
export const RESIST_ATTRS = ['', 'HT', 'Will', 'DX', 'IQ', 'ST', 'Per'];
