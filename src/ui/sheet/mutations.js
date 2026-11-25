// Edits to the sheet draft (pure data, no DOM).
import { secondaryList, attrBase, defaultAttr, compute } from '../../engine/index.js';
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

const NUMERIC_FIELDS = ['qty', 'weight', 'value', 'range', 'cost', 'mod', 'duration'];

export function setListField(data, list, i, field, raw) {
    if (list === 'skills' && field === 'level') { data[list][i][field] = String(raw).trim() === '' ? '' : num(raw); return; }
    data[list][i][field] = NUMERIC_FIELDS.includes(field) ? num(raw) : raw;
}

const NEW_ROW = {
    traits: () => ({ name: '', effect: '' }),
    skills: () => ({ name: '', attr: defaultAttr(), level: '' }),
    equipment: () => ({ name: '', qty: 1, weight: 0, value: 0, category: '', stat: '', effect: '' }),
    abilities: () => ({ name: '', kind: '', use: 'ranged', fx: 'damage', aim: '', skill: '', damage: '', stat: '', mod: 0, duration: 0, resist: '', range: 0, cost: 0, effect: '' }),
    reactions: () => ({ name: '', groups: [{ who: 'everyone', mod: 1 }] }),
};

export function addRow(data, list, sign) {
    if (NEW_ROW[list]) data[list].push(NEW_ROW[list](sign));
}

export function removeRow(data, list, i) {
    data[list].splice(i, 1);
}

export function addGroup(reaction) {
    reaction.groups = reaction.groups || [];
    reaction.groups.push({ who: '', mod: 1 });
}
