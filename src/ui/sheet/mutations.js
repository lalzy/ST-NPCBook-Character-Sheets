// Edits to the sheet draft (pure data, no DOM).
import { secondaryList, attrBase, defaultAttr, compute, rules, NEW_BLOCK } from '../../engine/index.js';
import { num } from '../../utils/number.js';

/** Set a secondary stat from the value typed in (stored as steps from its base). */
export function setSecFromValue(data, key, value) {
    const c = compute(data);
    const x = secondaryList().find(s => s.key === key);
    const step = x?.step || 1;
    data.sec[key] = Math.round((num(value) - num(c.bases[key])) / step);
}

/** Step an attribute or secondary stat by ±1. Returns the attribute's new value (for attrs). */
export function stepValue(data, cls, key, dir) {
    if (cls === 'attr') { data.attrs[key] = Math.max(1, num(data.attrs[key], attrBase()) + dir); return data.attrs[key]; }
    data.sec[key] = num(data.sec[key]) + dir;
    return undefined;
}

const NUMERIC_FIELDS = ['qty', 'weight', 'value', 'range', 'cost', 'mod', 'duration', 'castTime'];

export function setListField(data, list, i, field, raw) {
    if (list === 'skills' && (field === 'level' || field === 'points')) { data[list][i][field] = String(raw).trim() === '' ? '' : num(raw); return; }
    data[list][i][field] = NUMERIC_FIELDS.includes(field) ? num(raw) : raw;
}

const NEW_ROW = {
    traits: () => ({ name: '', effect: '' }),
    skills: () => ({ name: '', attr: defaultAttr(), level: '', points: '', diff: rules().skillDifficulties[0]?.name || '' }),
    equipment: () => ({ name: '', qty: 1, weight: 0, value: 0, category: '', equipped: true, effect: '', blocks: [] }),
    abilities: () => ({ name: '', kind: '', use: 'ranged', fx: 'damage', aim: '', skill: '', damage: '', stat: '', mod: 0, duration: 0, resist: '', dc: '', save: 'none', defendWith: '', castTime: 0, hits: 'roll', range: 0, cost: 0, resource: '', effect: '' }),
    reactions: () => ({ name: '', groups: [{ who: 'everyone', mod: 1 }] }),
};

export function addRow(data, list, sign) {
    if (NEW_ROW[list]) data[list].push(NEW_ROW[list](sign));
}

export function removeRow(data, list, i) {
    data[list].splice(i, 1);
}

const BLOCK_NUMERIC = ['range', 'cost', 'mod', 'duration', 'castTime', 'per'];

/** Add an item from a preset (empty blocks only). Returns the new item. */
export function addItem(data, preset) {
    const e = NEW_ROW.equipment();
    if (preset) {
        e.category = preset.category || '';
        if (preset.qty) e.qty = preset.qty;
        if (preset.effect) e.effect = preset.effect;
        e.blocks = (preset.blocks || []).filter(b => NEW_BLOCK[b.type]).map(b => ({ ...NEW_BLOCK[b.type](), ...JSON.parse(JSON.stringify(b)) }));
    }
    data.equipment.push(e);
    return e;
}

/** Add a block of `type` to item i. */
export function addBlock(data, i, type) {
    const e = data.equipment[i];
    if (!e || !NEW_BLOCK[type]) return;
    if (!Array.isArray(e.blocks)) e.blocks = [];
    e.blocks.push(NEW_BLOCK[type]());
}

export function removeBlock(data, i, bi) {
    const e = data.equipment[i];
    if (Array.isArray(e?.blocks)) e.blocks.splice(bi, 1);
}

export function setBlockField(data, i, bi, field, raw) {
    const b = data.equipment[i]?.blocks?.[bi];
    if (b) b[field] = BLOCK_NUMERIC.includes(field) ? num(raw) : raw;
}

export function addGroup(reaction) {
    reaction.groups = reaction.groups || [];
    reaction.groups.push({ who: '', mod: 1 });
}

/** Roll the HP dice not rolled yet (rules hpRoll), or all of them again with `all`. */
export function rollHp(data, all = false) {
    const info = compute(data).hpRoll;
    if (!info) return;
    const { n, sides, add } = info.dice;
    const die = () => { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return (a[0] % sides) + 1; };
    const rolls = Array.isArray(data.hpRolls) ? data.hpRolls.slice(0, info.count) : [];
    for (let i = 0; i < info.count; i++) {
        if (!all && Number.isFinite(Number(rolls[i])) && rolls[i] !== null) continue;
        let t = add;
        for (let k = 0; k < n; k++) t += die();
        rolls[i] = t;
    }
    data.hpRolls = rolls;
}
