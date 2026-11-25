// Derive every computed value of a sheet from the user's rules config (secondary stats, encumbrance, skills, points).
import { attrKeys, role, defaultAttr, rules, attrBase, secondaryList, skillAttrs, difficulties, skillsUsePoints } from '../rules/ruleset.js';
import { evalFormula } from '../rules/formula.js';
import { normalizeSheet } from './sheet.js';
import { basicLift, damage } from './strength.js';
import { relativeLevel } from './skills.js';
import { computeAbilities } from './abilities.js';
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

function computeSkills(skills, attrVal) {
    const attrs = skillAttrs();
    const diffs = difficulties();
    return skills.map(sk => {
        const pts = num(sk.pts);
        const attr = attrs.includes(sk.attr) ? sk.attr : defaultAttr();
        const diff = diffs.includes(sk.diff) ? sk.diff : (diffs[0] ?? '');
        const rel = relativeLevel(diff, pts);
        const level = rel === null ? null : (attr ? num(attrVal[attr]) : 0) + rel;
        return { ...sk, attr, diff, pts, rel, level, rsl: rel === null || !attr ? '' : `${attr}${rel >= 0 ? '+' : ''}${rel}` };
    });
}

function pointTotals(a, sec, traits, skills, abilities, budget) {
    const base = attrBase();
    const attrPts = attrKeys().reduce((sum, k) => sum + (a[k] - base) * (rules().attrCost[k] ?? 0), 0);
    const secPts = secondaryList().reduce((sum, x) => sum + num(sec[x.key]) * x.cost, 0);
    const advPts = traits.filter(t => num(t.pts) > 0).reduce((sum, t) => sum + num(t.pts), 0);
    const disPts = traits.filter(t => num(t.pts) < 0).reduce((sum, t) => sum + num(t.pts), 0);
    const skillPts = skillsUsePoints() ? skills.reduce((sum, s) => sum + Math.max(0, s.pts), 0) : 0;
    const abilityPts = abilities.reduce((sum, x) => sum + num(x.pts), 0);
    const total = attrPts + secPts + advPts + disPts + skillPts + abilityPts;
    return { attributes: attrPts, secondary: secPts, advantages: advPts, disadvantages: disPts, skills: skillPts, abilities: abilityPts, total, budget: num(budget, 100) };
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
    const skills = computeSkills(sh.skills, attrVal);
    const abilities = computeAbilities(sh.abilities, skills, attrVal, dmg.thrust, dmg.swing);

    return {
        attrs: a, values: v, bases, lift, attrVal, thrust: dmg.thrust, swing: dmg.swing,
        carried: Math.round(e.carried * 100) / 100, totalValue: e.totalValue,
        encumbrance: e.overloaded ? 'Overloaded' : e.enc ? e.enc.name : '—',
        encIndex: e.encIdx, move: e.move, dodge: e.dodge,
        skills,
        abilities,
        points: pointTotals(a, sh.sec, sh.traits, skills, abilities, sh.budget),
    };
}
