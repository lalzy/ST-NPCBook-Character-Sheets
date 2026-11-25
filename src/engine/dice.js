// Dice / weapon-stat / armor parsing.
import { normalizeSheet } from './sheet.js';
import { rules } from '../rules/ruleset.js';

/** "2d-1" -> { n: 2, sides: 6, add: -1 }, "1d8+2" -> { n: 1, sides: 8, add: 2 }. A bare "d" means six-sided. */
export function parseDice(s) {
    const m = String(s ?? '').replace(/\s+/g, '').match(/^(\d+)d(\d+)?([+-]\d+)?$/i);
    return m ? { n: Number(m[1]), sides: m[2] ? Number(m[2]) : 6, add: Number(m[3] || 0), sidesText: m[2] || '' } : null;
}

const diceText = (n, sidesText, add) => `${n}d${sidesText}${add ? (add > 0 ? `+${add}` : add) : ''}`;

/**
 * Damage from a stat like "2d+1 fire", "sw+2 type", "thr type" and the character's thrust/swing dice.
 * The damage type is any word after the dice; without one, the rules' default type is used.
 * Returns { n, sides, add, type, text } or null.
 */
export function weaponDamage(stat, thrust, swing) {
    const src = String(stat ?? '').trim().toLowerCase();
    const m = src.match(/^(sw|swing|thr|thrust|\d+d\d*)\s*([+-]\s*\d+)?\s*([a-z][a-z+\-]*)?/i);
    if (!m) return null;
    let base;
    if (/^sw/.test(m[1])) base = parseDice(swing);
    else if (/^thr/.test(m[1])) base = parseDice(thrust);
    else base = parseDice(m[1]);
    if (!base) return null;
    const add = base.add + Number(String(m[2] || '0').replace(/\s+/g, ''));
    const type = (m[3] || rules().defaultDamageType || '').toLowerCase();
    return { n: base.n, sides: base.sides, add, type, text: `${diceText(base.n, base.sidesText, add)}${type ? ` ${type}` : ''}` };
}

/** Armor value from a stat such as "DR 2" or "armor 2". */
export function parseDR(stat) {
    const m = String(stat ?? '').match(/\b(?:DR|armou?r)\s*(\d+)/i);
    return m ? Number(m[1]) : 0;
}

/** Total armor from armor items (category "armor"). */
export function totalDR(sheet) {
    const sh = normalizeSheet(sheet);
    return sh.equipment.filter(e => /armou?r/i.test(String(e.category || ''))).reduce((sum, e) => sum + parseDR(e.stat), 0);
}
