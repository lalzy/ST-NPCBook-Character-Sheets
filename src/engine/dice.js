// Dice / weapon-stat / armor parsing.
import { normalizeSheet } from './sheet.js';
import { rules } from '../rules/ruleset.js';
import { num } from '../utils/number.js';
import { itemBlocks, activeMods, modSum, isEquipped, slotList } from './items.js';

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
    // flat damage: a plain number, e.g. "5" or "5 fire"
    const flat = src.match(/^([+-]?\d+)(?!\s*d)\b\s*([a-z][a-z+\-]*)?/i);
    if (flat && !/^\d+\s*d/i.test(src)) {
        const type = (flat[2] || rules().defaultDamageType || '').toLowerCase();
        const add = Number(flat[1]);
        const div = /\(\s*(\d+(?:\.\d+)?)\s*\)/.exec(src);
        return { n: 0, sides: 0, add, type, text: `${add}${type ? ` ${type}` : ''}${div ? ` (${div[1]})` : ''}`, ...(div && Number(div[1]) > 0 ? { div: Number(div[1]) } : {}) };
    }
    // dice terms joined by + / −: the first may be sw / thr; later dice of other sizes are added ("1d8+2d6+3 piercing")
    const m = src.match(/^((?:sw|swing|thr|thrust|\d+d\d*)(?:\s*[+-]\s*(?:\d+d\d*|\d+)(?![a-z\d]))*)\s*([a-z][a-z+\-]*)?/i);
    if (!m) return null;
    const terms = m[1].replace(/\s+/g, '').match(/[+-]?(?:sw|swing|thr|thrust|\d+d\d*|\d+)/gi) || [];
    const first = terms.shift();
    let base;
    if (/^sw/.test(first)) base = parseDice(swing);
    else if (/^thr/.test(first)) base = parseDice(thrust);
    else base = parseDice(first);
    if (!base) return null;
    let add = base.add;
    const more = [];
    for (const t of terms) {
        const d = t.match(/^([+-]?)(\d+)d(\d*)$/i);
        if (d) { if (d[1] !== '-') more.push({ n: Number(d[2]), sides: d[3] ? Number(d[3]) : 6, sidesText: d[3] }); }
        else add += Number(t);
    }
    const type = (m[2] || rules().defaultDamageType || '').toLowerCase();
    const moreText = more.map(x => `+${x.n}d${x.sidesText}`).join('');
    const out = { n: base.n, sides: base.sides, add, type, text: `${base.n}d${base.sidesText}${moreText}${add ? (add > 0 ? `+${add}` : add) : ''}${type ? ` ${type}` : ''}` };
    if (more.length) out.more = more.map(({ n, sides }) => ({ n, sides }));
    // an armor divisor written in brackets: "2d+1 cut (2)", "3d pi (0.5)" (Combat Mode uses it when its rules say so)
    const div = /\(\s*(\d+(?:\.\d+)?)\s*\)/.exec(src);
    if (div && Number(div[1]) > 0) { out.div = Number(div[1]); out.text += ` (${div[1]})`; }
    return out;
}

/** Armor value from a stat such as "DR 2" or "armor 2". */
export function parseDR(stat) {
    const m = String(stat ?? '').match(/\b(?:DR|armou?r)\s*(\d+)/i);
    return m ? Number(m[1]) : 0;
}

/** Does an item's category count toward armor? The rules' armorCategories, else categories with "armor" in them. */
export function armorItem(e) {
    const cat = String(e?.category || '').toLowerCase();
    const list = rules().armorCategories;
    if (!list.length) return /armou?r/.test(cat);
    return list.some(w => cat.split(/[^a-z0-9]+/).includes(w) || cat === w);
}

/**
 * Defense bonuses from gear: every active modifier block aimed at dodge / parry / block / armorClass.
 * Returns { dodge, parry, block, armorClass }.
 */
export function gearBonuses(sheet) {
    const sh = normalizeSheet(sheet);
    const mods = activeMods(sh.equipment);
    return { dodge: modSum(mods, 'dodge'), parry: modSum(mods, 'parry'), block: modSum(mods, 'block'), armorClass: modSum(mods, 'armorClass') };
}

/**
 * Where an armor item is worn: the words after "covers" in its stat text ("DR 4 covers torso, groin"), split on commas,
 * slashes, "&" and "and". [] when it says nothing (Combat Mode then counts it everywhere, unless its rules say otherwise).
 */
export function armorCovers(stat) {
    const m = /\bcovers?\s*:?\s*([^;.()\d]+)/i.exec(String(stat ?? ''));
    if (!m) return [];
    return m[1].split(/\s*(?:,|\/|&|\band\b)\s*/i).map(x => x.trim().toLowerCase()).filter(Boolean);
}

/**
 * Armor pieces worn: every armor Defense block of an equipped item, with its value (plus "this item's armor" modifiers)
 * and its slots: [{ name, dr, covers }] (for armor by hit location in Combat Mode; covers [] = everywhere).
 */
export function armorList(sheet) {
    const sh = normalizeSheet(sheet);
    const mods = activeMods(sh.equipment);
    const out = [];
    sh.equipment.forEach((e, i) => {
        if (!isEquipped(e)) return;
        const bonus = modSum(mods, 'item:armor', i);
        for (const b of itemBlocks(e)) {
            if (b.type !== 'defense' || b.kind !== 'armor') continue;
            const dr = num(b.value) + bonus;
            if (dr > 0) out.push({ name: String(e.name || ''), dr, covers: slotList(b) });
        }
    });
    return out;
}

/** Total armor: all worn armor pieces plus modifiers to "armor (total)". The rules' armorClass formula sees it as `armor`. */
export function totalDR(sheet) {
    const sh = normalizeSheet(sheet);
    return armorList(sh).reduce((sum, x) => sum + x.dr, 0) + modSum(activeMods(sh.equipment), 'armor');
}
