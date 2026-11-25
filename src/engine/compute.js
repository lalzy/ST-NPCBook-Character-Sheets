// Derive every computed value of a sheet from the user's rules config (secondary stats, encumbrance, skills).
import { attrKeys, role, defaultAttr, rules, attrBase, secondaryList, skillAttrs } from '../rules/ruleset.js';
import { evalFormula } from '../rules/formula.js';
import { normalizeSheet } from './sheet.js';
import { basicLift, damage } from './strength.js';
import { computeAbilities } from './abilities.js';
import { totalDR } from './dice.js';
import { num } from '../utils/number.js';

/** Secondary values in list order; each base formula sees the attributes and the secondaries before it. */
function secondaryValues(a, sec) {
    const vars = { ...a };
    const v = {};
    const bases = {};
    for (const x of secondaryList()) {
        bases[x.key] = evalFormula(x.base, vars, 0);
        v[x.key] = bases[x.key] + x.step * num(sec[x.key]);
        vars[x.key] = v[x.key];
    }
    const lift = basicLift(vars);
    if (lift !== null) vars.lift = lift;
    return { v, bases, vars, lift };
}

function encumbrance(equipment, v, vars, lift) {
    const carried = equipment.reduce((sum, e) => sum + num(e.weight) * Math.max(0, num(e.qty, 1)), 0);
    const totalValue = equipment.reduce((sum, e) => sum + num(e.value) * Math.max(0, num(e.qty, 1)), 0);
    const levels = rules().encumbrance;
    const baseMove = v[role('move')] ?? null;
    const dodgeBase = evalFormula(rules().dodge, vars, null);
    if (!levels.length || lift === null) {
        return { carried, totalValue, encIdx: -1, enc: null, overloaded: false, move: baseMove, dodge: dodgeBase };
    }
    let encIdx = levels.findIndex(x => carried <= x.load * lift);
    const overloaded = encIdx < 0;
    if (overloaded) encIdx = levels.length;
    const enc = levels[Math.min(encIdx, levels.length - 1)];
    const move = baseMove === null ? null : overloaded ? 0 : Math.floor(baseMove * enc.move);
    const dodge = dodgeBase === null ? null : dodgeBase + enc.dodge;
    return { carried, totalValue, encIdx, enc, overloaded, move, dodge };
}

function computeSkills(skills) {
    const attrs = skillAttrs();
    return skills.map(sk => {
        const attr = attrs.includes(sk.attr) ? sk.attr : defaultAttr();
        const n = Number(sk.level);
        const level = sk.level === '' || sk.level === null || sk.level === undefined || !Number.isFinite(n) ? null : n;
        return { name: sk.name, attr, level };
    });
}

/** All computed values for a sheet. Values the rules don't define are null. */
export function compute(sheet) {
    const sh = normalizeSheet(sheet);
    const base = attrBase();
    const a = Object.fromEntries(attrKeys().map(k => [k, num(sh.attrs[k], base)]));
    const { v, bases, vars, lift } = secondaryValues(a, sh.sec);
    const dmg = damage(a[role('damage')]);
    const e = encumbrance(sh.equipment, v, vars, lift);
    const attrVal = vars;
    const skills = computeSkills(sh.skills);
    const abilities = computeAbilities(sh.abilities, skills, attrVal, dmg.thrust, dmg.swing);
    const acRaw = evalFormula(rules().armorClass, { ...vars, armor: totalDR(sh) }, null);
    const ac = acRaw === null ? null : Math.floor(acRaw);

    return {
        attrs: a, values: v, bases, lift, attrVal, thrust: dmg.thrust, swing: dmg.swing,
        carried: Math.round(e.carried * 100) / 100, totalValue: e.totalValue,
        encumbrance: e.overloaded ? 'Overloaded' : e.enc ? e.enc.name : '—',
        encIndex: e.encIdx, move: e.move, dodge: e.dodge, ac,
        skills,
        abilities,
    };
}
