// Derive every computed value of a sheet from the user's rules config (secondary stats, encumbrance, skills).
import { attrKeys, role, defaultAttr, rules, attrBase, secondaryList, skillAttrs, skillsUsePoints, statLabel as statLabelOf } from '../rules/ruleset.js';
import { relativeLevel } from './skills.js';
import { evalFormula } from '../rules/formula.js';
import { normalizeSheet } from './sheet.js';
import { basicLift, damage } from './strength.js';
import { computeAbilities } from './abilities.js';
import { totalDR, parseDice, gearBonuses } from './dice.js';
import { num } from '../utils/number.js';
import { itemBlocks, isEquipped, activeMods, modSum, chargePool } from './items.js';

/**
 * HP gained by dice (rules hpRoll): one roll per point of the `per` value. Rolls not made yet count as the
 * average (half the die + 1 per die); the first one is the dice's maximum when first is 'max'.
 * Returns { count, rolls, total } or null when the rules have no hpRoll.
 */
export function hpRollInfo(rolls, perValue) {
    const R = rules().hpRoll;
    const d = parseDice(R.dice);
    if (!R.per || !d) return null;
    const count = Math.max(0, Math.floor(num(perValue)));
    const avg = d.n * (Math.floor(d.sides / 2) + 1) + d.add;
    const max = d.n * d.sides + d.add;
    const got = Array.isArray(rolls) ? rolls : [];
    const used = Array.from({ length: count }, (_, i) => (i === 0 && R.first === 'max' ? max : Number.isFinite(Number(got[i])) && got[i] !== null ? Number(got[i]) : null));
    const total = used.reduce((s, x) => s + (x === null ? avg : x), 0);
    return { count, rolls: used, missing: used.filter(x => x === null).length, total, dice: d, max };
}

/** Secondary values in list order; each base formula sees the attributes and the secondaries before it. */
function secondaryValues(a, sec, hpRolls, mods = []) {
    const vars = { ...a };
    const v = {};
    const bases = {};
    const per = rules().hpRoll.per;
    for (const x of secondaryList()) {
        if (per && vars[per] !== undefined) vars.HPRolls = hpRollInfo(hpRolls, vars[per])?.total ?? 0;
        bases[x.key] = evalFormula(x.base, vars, 0);
        v[x.key] = bases[x.key] + x.step * num(sec[x.key]) + modSum(mods, `sec:${x.key}`);
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

const given = (v) => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v));

/**
 * Skill levels. With a skillCosts table in the rules, a skill with points gets attribute + difficulty + the level
 * those points buy (fromPoints true); otherwise, and for a skill without points, the typed level is used.
 */
function computeSkills(skills, attrVal, mods = []) {
    const attrs = skillAttrs();
    const usePts = skillsUsePoints();
    return skills.map(sk => {
        const attr = attrs.includes(sk.attr) ? sk.attr : defaultAttr();
        if (usePts && given(sk.points)) {
            const rel = relativeLevel(sk.diff, Number(sk.points));
            const base = Number(attrVal?.[attr]);
            const level = rel === null || !Number.isFinite(base) ? null : base + rel + modSum(mods, `skill:${String(sk.name || '').trim()}`);
            return { name: sk.name, attr, level, points: Number(sk.points), diff: sk.diff || '', fromPoints: true };
        }
        return { name: sk.name, attr, level: given(sk.level) ? Number(sk.level) + modSum(mods, `skill:${String(sk.name || '').trim()}`) : null, points: given(sk.points) ? Number(sk.points) : null, diff: sk.diff || '', fromPoints: false };
    });
}

/**
 * Abilities stored on equipped items (a wand of fireball, a flaming sword, a ring…). The wielder does not need to know them.
 * roll fixed: the level is the block's own number or formula; roll skill: like a character ability (skill / attribute / auto).
 * Cost can be paid from one of the item's charge pools ("charges:<name>"); an empty pool marks it empty.
 */
function computeItemAbilities(equipment, skills, attrVal, thrust, swing) {
    const out = [];
    (equipment || []).forEach((e, i) => {
        if (!isEquipped(e)) return;
        itemBlocks(e).forEach((b, bi) => {
            if (b.type !== 'ability' || !String(b.name || '').trim()) return;
            const [a] = computeAbilities([b], skills, attrVal, thrust, swing);
            if (b.roll === 'fixed') {
                const raw = String(b.level ?? '').trim();
                const lv = raw === '' ? null : (Number.isFinite(Number(raw)) ? Number(raw) : evalFormula(raw, attrVal, null));
                a.level = lv === null ? (a.hits === 'auto' ? 0 : null) : Math.floor(lv);
                a.via = String(e.name || 'item');
            }
            const pool = chargePool(e, b.resource);
            if (pool) a.resource = `${pool.name} (${String(e.name || '').trim()})`;
            out.push({ ...a, item: String(e.name || ''), itemIndex: i, blockIndex: bi, pool, empty: !!pool && pool.left !== null && pool.left < a.cost });
        });
    });
    return out;
}

/** All computed values for a sheet. Values the rules don't define are null. */
export function compute(sheet) {
    const sh = normalizeSheet(sheet);
    const base = attrBase();
    const mods = activeMods(sh.equipment); // item Modifier blocks (attributes, secondary stats, skills, defenses…)
    const a = Object.fromEntries(attrKeys().map(k => [k, num(sh.attrs[k], base) + modSum(mods, `attr:${k}`)]));
    const { v, bases, vars, lift } = secondaryValues(a, sh.sec, sh.hpRolls, mods);
    const dmg = damage(a[role('damage')]);
    const e = encumbrance(sh.equipment, v, vars, lift);
    const gear = gearBonuses(sh);
    if (e.dodge !== null) e.dodge += gear.dodge;
    const attrVal = vars;
    const skills = computeSkills(sh.skills, attrVal, mods);
    const abilities = computeAbilities(sh.abilities, skills, attrVal, dmg.thrust, dmg.swing);
    const itemAbilities = computeItemAbilities(sh.equipment, skills, attrVal, dmg.thrust, dmg.swing);
    const acRaw = evalFormula(rules().armorClass, { ...vars, armor: totalDR(sh) }, null);
    const ac = acRaw === null ? null : Math.floor(acRaw) + gear.armorClass;
    const per = rules().hpRoll.per;
    const hpRoll = per ? hpRollInfo(sh.hpRolls, vars[per]) : null;
    // resources abilities spend: the rules' list (max formulas), else the stamina value
    const resources = rules().resources.length
        ? rules().resources.map(x => ({ name: x.name, max: Math.max(0, Math.floor(evalFormula(x.max, vars, 0) ?? 0)) }))
        : (role('stamina') && v[role('stamina')] !== undefined ? [{ name: statLabelOf(role('stamina')), max: v[role('stamina')] }] : []);

    return {
        attrs: a, values: v, bases, lift, attrVal, thrust: dmg.thrust, swing: dmg.swing,
        carried: Math.round(e.carried * 100) / 100, totalValue: e.totalValue,
        encumbrance: e.overloaded ? 'Overloaded' : e.enc ? e.enc.name : '—',
        encIndex: e.encIdx, move: e.move, dodge: e.dodge, ac, gear,
        skills,
        abilities,
        itemAbilities,
        mods,
        hpRoll,
        resources,
    };
}
