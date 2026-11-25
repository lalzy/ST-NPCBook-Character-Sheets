// Sheet data model: defaults, blank detection, normalization.
import { ATTRS, SECONDARY } from './rules.js';
import { num } from '../utils/number.js';

export function defaultSheet() {
    return {
        version: 1,
        enabled: false, // per character: only enabled sheets are sent / used
        budget: 100,
        tl: 3,
        sm: 0,
        attrs: { ST: 10, DX: 10, IQ: 10, HT: 10 },
        sec: Object.fromEntries(SECONDARY.map(x => [x.key, 0])),
        traits: [],     // { name, pts, effect }  (pts > 0 advantage/perk, < 0 disadvantage/quirk)
        skills: [],     // { name, attr, diff, pts }
        equipment: [],  // { name, qty, weight (lb, each), value ($, each), category, stat, effect }
        abilities: [],  // { name, kind, use: ranged|melee|utility, skill, damage, range, cost (FP), pts, effect }
        reactions: [],  // { name, groups: [{ who, mod }] }
        notes: '',
    };
}

/** True when a sheet holds nothing but defaults. */
export function isBlankSheet(s) {
    const a = s?.attrs || {};
    return ATTRS.every(k => num(a[k], 10) === 10)
        && SECONDARY.every(x => !num(s?.sec?.[x.key]))
        && !(s?.traits?.length) && !(s?.skills?.length) && !(s?.equipment?.length) && !(s?.abilities?.length) && !(s?.reactions?.length);
}

export function normalizeSheet(s) {
    const d = defaultSheet();
    const o = { ...d, ...(s || {}) };
    // Sheets saved before the toggle existed: keep the ones that were actually filled in switched on.
    if (s && s.enabled === undefined) o.enabled = !isBlankSheet(s);
    o.attrs = { ...d.attrs, ...(s?.attrs || {}) };
    o.sec = { ...d.sec, ...(s?.sec || {}) };
    for (const k of ['traits', 'skills', 'equipment', 'abilities', 'reactions']) o[k] = Array.isArray(s?.[k]) ? s[k] : [];
    return o;
}
