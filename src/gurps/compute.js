// Derive every computed value of a sheet (secondary stats, encumbrance, skills, point totals).
import { ATTRS, ATTR_COST, SECONDARY, SKILL_ATTRS, DIFFICULTIES, ENCUMBRANCE } from './rules.js';
import { normalizeSheet } from './sheet.js';
import { basicLift, damage } from './strength.js';
import { relativeLevel } from './skills.js';
import { computeAbilities } from './abilities.js';
import { num } from '../utils/number.js';

function secondaryValues(a, sec) {
    const base = {
        HP: a.ST, FP: a.HT, Will: a.IQ, Per: a.IQ,
        BasicSpeed: (a.HT + a.DX) / 4,
    };
    const v = {};
    v.HP = base.HP + num(sec.HP);
    v.FP = base.FP + num(sec.FP);
    v.Will = base.Will + num(sec.Will);
    v.Per = base.Per + num(sec.Per);
    v.Fright = v.Will + num(sec.Fright);
    v.Vision = v.Per + num(sec.Vision);
    v.Hearing = v.Per + num(sec.Hearing);
    v.TasteSmell = v.Per + num(sec.TasteSmell);
    v.Touch = v.Per + num(sec.Touch);
    v.BasicSpeed = base.BasicSpeed + 0.25 * num(sec.BasicSpeed);
    v.BasicMove = Math.floor(v.BasicSpeed) + num(sec.BasicMove);
    v.BasicLift = basicLift(a.ST);
    const bases = {
        HP: base.HP, FP: base.FP, Will: base.Will, Per: base.Per, Fright: v.Will,
        Vision: v.Per, Hearing: v.Per, TasteSmell: v.Per, Touch: v.Per,
        BasicSpeed: base.BasicSpeed, BasicMove: Math.floor(v.BasicSpeed),
    };
    return { v, bases };
}

function encumbrance(equipment, v) {
    const carried = equipment.reduce((sum, e) => sum + num(e.weight) * Math.max(0, num(e.qty, 1)), 0);
    const totalValue = equipment.reduce((sum, e) => sum + num(e.value) * Math.max(0, num(e.qty, 1)), 0);
    let encIdx = ENCUMBRANCE.findIndex(x => carried <= x.mult * v.BasicLift);
    if (encIdx < 0) encIdx = ENCUMBRANCE.length; // overloaded
    const enc = ENCUMBRANCE[Math.min(encIdx, ENCUMBRANCE.length - 1)];
    const overloaded = encIdx >= ENCUMBRANCE.length;
    const move = overloaded ? 0 : Math.max(1, Math.floor(v.BasicMove * enc.move));
    const dodgeBase = Math.floor(v.BasicSpeed) + 3;
    const dodge = dodgeBase + (overloaded ? -4 : enc.dodge);
    return { carried, totalValue, encIdx, enc, overloaded, move, dodge };
}

function computeSkills(skills, attrVal) {
    return skills.map(sk => {
        const pts = num(sk.pts);
        const attr = SKILL_ATTRS.includes(sk.attr) ? sk.attr : 'DX';
        const diff = DIFFICULTIES.includes(sk.diff) ? sk.diff : 'A';
        const rel = relativeLevel(diff, pts);
        const level = rel === null ? null : attrVal[attr] + rel;
        return { ...sk, attr, diff, pts, rel, level, rsl: rel === null ? '' : `${attr}${rel >= 0 ? '+' : ''}${rel}` };
    });
}

function pointTotals(a, sec, traits, skills, abilities, budget) {
    const attrPts = ATTRS.reduce((sum, k) => sum + (a[k] - 10) * ATTR_COST[k], 0);
    const secPts = SECONDARY.reduce((sum, x) => sum + num(sec[x.key]) * x.cost, 0);
    const advPts = traits.filter(t => num(t.pts) > 0).reduce((sum, t) => sum + num(t.pts), 0);
    const disPts = traits.filter(t => num(t.pts) < 0).reduce((sum, t) => sum + num(t.pts), 0);
    const skillPts = skills.reduce((sum, s) => sum + Math.max(0, s.pts), 0);
    const abilityPts = abilities.reduce((sum, x) => sum + num(x.pts), 0);
    const total = attrPts + secPts + advPts + disPts + skillPts + abilityPts;
    return { attributes: attrPts, secondary: secPts, advantages: advPts, disadvantages: disPts, skills: skillPts, abilities: abilityPts, total, budget: num(budget, 100) };
}

/** All computed values for a sheet. */
export function compute(sheet) {
    const sh = normalizeSheet(sheet);
    const a = Object.fromEntries(ATTRS.map(k => [k, num(sh.attrs[k], 10)]));
    const { v, bases } = secondaryValues(a, sh.sec);
    const dmg = damage(a.ST);
    const e = encumbrance(sh.equipment, v);
    const attrVal = { ...a, Will: v.Will, Per: v.Per };
    const skills = computeSkills(sh.skills, attrVal);
    const abilities = computeAbilities(sh.abilities, skills, attrVal, dmg.thrust, dmg.swing);

    return {
        attrs: a, values: v, bases, thrust: dmg.thrust, swing: dmg.swing,
        carried: Math.round(e.carried * 100) / 100, totalValue: e.totalValue, encumbrance: e.overloaded ? 'Overloaded' : e.enc.name,
        encIndex: e.encIdx, move: e.move, dodge: e.dodge,
        skills,
        abilities,
        points: pointTotals(a, sh.sec, sh.traits, skills, abilities, sh.budget),
    };
}
