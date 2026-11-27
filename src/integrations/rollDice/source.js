// Registers the character-sheet source with Roll Dice.
import { EXT_ID } from '../../core/constants.js';
import { settings } from '../../core/context.js';
import { rules } from '../../rules/ruleset.js';
import { normalizeSheet, combatActions, totalDR, compute, role, sheetMacros, armorList } from '../../engine/index.js';
import { rollDice } from './api.js';
import { rollablesFor } from './rollables.js';

function entryFor(sheet, key, name, prefix) {
    const c = compute(sheet);
    return {
        key, name, prefix, rollables: rollablesFor(sheet), combat: combatActions(sheet), dr: totalDR(sheet),
        armor: armorList(sheet), // [{ name, dr, covers }]: worn armor and where ("DR 4 covers torso"), for armor by hit location
        hp: c.values[role('health')] ?? null, fp: c.values[role('stamina')] ?? null, move: c.move, speed: c.values[role('speed')] ?? null,
        ac: c.ac ?? null, // armor class, when the rules define one (passive defense)
        attrs: { ...c.attrVal }, // for resistance rolls
        resources: c.resources, // [{ name, max }]: what abilities spend (FP, mana, slots…)
        macros: sheetMacros(sheet), // [{ name, arg, args, from }]: effect macros in trait / item text, e.g. {{haste}}, {{immunity cold}}
        macroDefs: rules().macros, // what they do: the home-brew macro definitions of these rules (Combat Mode applies them)
    };
}

function getCharacters() {
    const api = window.NPCBook;
    if (!api || !settings().enabled) return [];
    const out = [];
    const scene = api.getScene();
    const me = api.getPersonaData(EXT_ID);
    if (me && normalizeSheet(me).enabled) out.push(entryFor(me, 'user', `${scene.userName || 'You'} (you)`, ''));
    for (const npc of scene.roster) {
        const sh = npc.instance?.ext?.[EXT_ID];
        if (sh && normalizeSheet(sh).enabled) out.push(entryFor(sh, npc.id, npc.name, `${npc.name}'s`));
    }
    return out;
}

export function registerRollSource() {
    const rd = rollDice();
    if (!rd?.registerSource) return;
    rd.registerSource({ id: EXT_ID, label: 'Character sheet', getCharacters });
}

/** Register now if Roll Dice is already loaded, and again whenever it announces itself. */
export function initRollDice() {
    if (window.RollDice) registerRollSource();
    document.addEventListener('rolldice:ready', registerRollSource);
}
