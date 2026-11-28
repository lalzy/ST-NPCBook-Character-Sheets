// What a character holds (the Equipment tab): one item in the primary hand and one in the off-hand.
// An item takes 1 or 2 hands (its own `hands` field; not set = 1). A two-handed item in the primary hand fills both.
// Hand names and handedness come from the rules (rules.hands); nothing about them is enforced here: it is a record
// that Combat Mode reads (what is ready to use, what has to be readied first).
import { rules } from '../rules/ruleset.js';
import { isCarried } from './items.js';

const str = (v) => String(v ?? '').trim();

/** How many hands an item takes: 2, else 1 (also when not set). */
export const itemHands = (e) => (Number(e?.hands) === 2 ? 2 : 1);

/** Carried items that can be held: [{ name, hands }] (first of each name). */
export function holdable(sheet) {
    const seen = new Set();
    const out = [];
    for (const e of Array.isArray(sheet?.equipment) ? sheet.equipment : []) {
        const name = str(e?.name);
        if (!name || !isCarried(e) || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        out.push({ name, hands: itemHands(e) });
    }
    return out;
}

/**
 * What it holds now, checked against what it carries: { primary, off } (item names, '' = empty).
 * A two-handed item is only in the primary hand and fills the off-hand too (off = ''); an item no longer carried is dropped.
 */
export function heldOf(sheet) {
    const list = holdable(sheet);
    const find = (n) => list.find(x => x.name.toLowerCase() === str(n).toLowerCase()) || null;
    const H = sheet?.held && typeof sheet.held === 'object' ? sheet.held : {};
    let primary = find(H.primary);
    let off = find(H.off);
    if (off && off.hands === 2) off = null;
    if (primary && primary.hands === 2) off = null;
    // the same single item can't be in both hands (unless it is carried more than once: a pair of daggers)
    if (primary && off && primary.name === off.name && !twoOf(sheet, primary.name)) off = null;
    return { primary: primary?.name || '', off: off?.name || '', twoHanded: primary?.hands === 2 };
}

/** Is item `name` carried more than once (a pair of daggers: one in each hand)? */
export function twoOf(sheet, name) {
    const e = (Array.isArray(sheet?.equipment) ? sheet.equipment : []).find(x => str(x?.name).toLowerCase() === str(name).toLowerCase());
    return Number(e?.qty ?? 1) > 1;
}

/** The handedness entry the character has (rules.hands.handedness), or null. */
export function handednessOf(sheet) {
    const list = rules().hands.handedness;
    if (!list.length) return null;
    return list.find(h => h.name.toLowerCase() === str(sheet?.handedness).toLowerCase()) || list[0];
}

/** What its hands are called: { primary, off } (from its handedness when the rules have one, else rules.hands). */
export function handLabels(sheet) {
    const H = rules().hands;
    const h = handednessOf(sheet);
    return { primary: h?.primary || H.primary, off: h?.off || H.off };
}

/** Put items in its hands (names; '' empties a hand). Returns the sheet's new held state. */
export function setHeld(sheet, { primary, off } = {}) {
    const before = sheet.held && typeof sheet.held === 'object' ? sheet.held : {};
    sheet.held = { primary: str(primary ?? before.primary), off: str(off ?? before.off) };
    const h = heldOf(sheet);
    sheet.held = { primary: h.primary, off: h.off };
    return h;
}
