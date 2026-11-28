// window.NPCBookSheet: what other extensions (Combat Mode) may read and change on a scene character's sheet.
// key: 'user' (your persona) or an NPC id, as in the Roll Dice character entries this sheet sends.
import { normalizeSheet, heldOf, holdable, handLabels, setHeld as putHeld } from '../engine/index.js';
import { sheetOfKey, storeSheetOfKey } from './npcBook/register.js';

export const SHEET_API_VERSION = 1;

/** What a character holds now: { primary, off, twoHanded, labels: { primary, off }, items: [{ name, hands }] }, or null. */
export function getHeld(key) {
    const f = sheetOfKey(key);
    if (!f) return null;
    return { ...heldOf(f.data), labels: handLabels(f.data), items: holdable(f.data) };
}

/**
 * Put items in a character's hands ({ primary, off }: item names, '' = empty, left out = unchanged) and store it.
 * Returns the new held state, or null when the character has no sheet.
 */
export function setHeld(key, held = {}) {
    const f = sheetOfKey(key);
    if (!f) return null;
    const data = normalizeSheet(f.data);
    const h = putHeld(data, held);
    return storeSheetOfKey(f, data) ? h : null;
}

export function exposeSheetApi() {
    window.NPCBookSheet = { apiVersion: SHEET_API_VERSION, getHeld, setHeld };
    document.dispatchEvent(new CustomEvent('npcbooksheet:ready', { detail: window.NPCBookSheet }));
}
