// Dice / weapon-stat / armor parsing.
import { normalizeSheet } from './sheet.js';

/** "2d-1" -> { n: 2, add: -1 } */
export function parseDice(s) {
    const m = String(s ?? '').replace(/\s+/g, '').match(/^(\d+)d([+-]\d+)?$/i);
    return m ? { n: Number(m[1]), add: Number(m[2] || 0) } : null;
}

/**
 * Damage from a weapon stat like "sw+2 cr", "thr imp", "2d+1 pi", "1d-1 burn" and the character's thrust/swing.
 * Returns { n, add, type, text } or null.
 */
export function weaponDamage(stat, thrust, swing) {
    const src = String(stat ?? '').trim().toLowerCase();
    const m = src.match(/^(sw|swing|thr|thrust|\d+d)\s*([+-]\s*\d+)?\s*(pi\+\+|pi\+|pi-|pi|cut|imp|cr|burn|cor|tox|fat|tbb)?/i);
    if (!m) return null;
    let base;
    if (/^sw/.test(m[1])) base = parseDice(swing);
    else if (/^thr/.test(m[1])) base = parseDice(thrust);
    else base = { n: Number(m[1].replace(/d$/i, '')), add: 0 };
    if (!base) return null;
    const add = base.add + Number(String(m[2] || '0').replace(/\s+/g, ''));
    const type = (m[3] || 'cr').toLowerCase();
    return { n: base.n, add, type, text: `${base.n}d${add ? (add > 0 ? `+${add}` : add) : ''} ${type}` };
}

export function parseDR(stat) {
    const m = String(stat ?? '').match(/\bDR\s*(\d+)/i);
    return m ? Number(m[1]) : 0;
}

/** Total DR from armor items (category "armor"). */
export function totalDR(sheet) {
    const sh = normalizeSheet(sheet);
    return sh.equipment.filter(e => /armou?r/i.test(String(e.category || ''))).reduce((sum, e) => sum + parseDR(e.stat), 0);
}
