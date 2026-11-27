// Sheet data model: defaults, blank detection, normalization.
import { attrKeys, attrBase } from '../rules/ruleset.js';
import { num } from '../utils/number.js';

export function defaultSheet() {
    const base = attrBase();
    return {
        version: 1,
        enabled: false, // per character: only enabled sheets are sent / used
        attrs: Object.fromEntries(attrKeys().map(k => [k, base])),
        sec: {},        // { [secondary key]: steps above / below its base }
        traits: [],     // { name, effect }
        skills: [],     // { name, attr, level }
        equipment: [],  // { name, qty, weight (each), value (each), category (label only), equipped, effect, blocks: [...] } (see items.js)
        abilities: [],  // { name, kind, use: ranged|melee|utility, skill, damage, range, cost, resource, dc, save, defendWith, castTime, hits: roll|auto, effect }
        hpRolls: [],    // HP dice rolled so far (rules hpRoll), one per level
        reactions: [],  // { name, groups: [{ who, mod }] }
        notes: '',
    };
}

/** True when a sheet holds nothing but defaults. */
export function isBlankSheet(s) {
    const a = s?.attrs || {};
    const base = attrBase();
    return attrKeys().every(k => num(a[k], base) === base)
        && Object.values(s?.sec || {}).every(v => !num(v))
        && !(s?.traits?.length) && !(s?.skills?.length) && !(s?.equipment?.length) && !(s?.abilities?.length) && !(s?.reactions?.length);
}

export function normalizeSheet(s) {
    const d = defaultSheet();
    const o = { ...d, ...(s || {}) };
    o.attrs = { ...d.attrs, ...(s?.attrs || {}) };
    o.sec = { ...(s?.sec || {}) };
    for (const k of ['traits', 'skills', 'equipment', 'abilities', 'reactions', 'hpRolls']) o[k] = Array.isArray(s?.[k]) ? s[k] : [];
    return o;
}
