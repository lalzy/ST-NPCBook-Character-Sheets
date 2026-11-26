// Abilities: spells, psionics, powers or anything else the user calls them.
// Each one is rolled against a skill or attribute and can work as an attack (ranged / melee) beside inventory weapons.
import { ABILITY_USES, ABILITY_FX, ABILITY_AIMS, ABILITY_STATS, SAVE_RESULTS, resistAttrs } from './rules.js';
import { rules, statLabel as keyLabel, role, defaultAttr, skillAttrs } from '../rules/ruleset.js';
import { evalFormula } from '../rules/formula.js';
import { weaponDamage } from './dice.js';
import { expandFormulas } from './items.js';
import { num } from '../utils/number.js';

const lc = (s) => String(s ?? '').trim().toLowerCase();

export const abilityUse = (ab) => (ABILITY_USES.includes(ab?.use) ? ab.use : 'ranged');
export const isAttackAbility = (ab) => abilityUse(ab) !== 'utility';

/** Mechanical effect. Sheets from before effects existed: damage for attacks, none for utility. */
export const abilityFx = (ab) => (ABILITY_FX.includes(ab?.fx) ? ab.fx : (abilityUse(ab) === 'utility' ? 'none' : 'damage'));

/** Default target for an effect: helpful effects go on allies, the rest on enemies. */
export const defaultAim = (fx) => (['heal', 'fp', 'buff', 'haste'].includes(fx) ? 'ally' : fx === 'none' ? 'any' : 'enemy');
export const abilityAim = (ab) => (ABILITY_AIMS.includes(ab?.aim) ? ab.aim : defaultAim(abilityFx(ab)));

/** The label the rules config gives a secondary key, else a plain word. */
const statLabel = (r, word) => (role(r) ? keyLabel(role(r)) : word);

/** Short human text of what an ability does, e.g. "heal 2d", "debuff −2 defense, 3 turns", "stun 1 turn". */
export function fxText(a) {
    const turns = (n) => `${n} turn${n === 1 ? '' : 's'}`;
    const amount = a.amount ? a.amount.text : '';
    switch (a.fx) {
        case 'damage': return a.dmg ? a.dmg.text : 'damage (none set)';
        case 'heal': return `heal ${amount || '?'} ${statLabel('health', 'health')}`;
        case 'fp': return `restore ${amount || '?'} ${statLabel('stamina', 'stamina')}`;
        case 'buff': case 'debuff': return `${a.fx} ${a.mod >= 0 ? '+' : ''}${a.mod} ${a.stat}, ${turns(a.duration)}`;
        case 'stun': return `stun ${turns(a.duration)}`;
        case 'disarm': return 'disarm';
        case 'haste': return `${a.mod || 1} extra action${(a.mod || 1) === 1 ? '' : 's'} a turn, ${turns(a.duration)}`;
        case 'poison': case 'bleed': return `${a.fx === 'poison' ? 'poisoned' : 'bleeding'}: ${amount || '?'} each turn, ${turns(a.duration)}`;
        default: return 'no automatic effect';
    }
}

/**
 * The level an ability is rolled at.
 * skill = an attribute or secondary key → that value; = a skill on the sheet → its level;
 * empty → a skill named like the ability (a spell is just a skill); otherwise the untrained level from the rules.
 */
export function abilityLevel(ab, skills, attrVal) {
    const link = String(ab.skill ?? '').trim();
    if (skillAttrs().includes(link)) return { level: attrVal[link] ?? null, via: link };
    const byName = (n) => skills.find(s => lc(s.name) === lc(n) && s.level !== null);
    const sk = link ? byName(link) : byName(ab.name);
    if (sk) return { level: sk.level, via: sk.name };
    return untrainedLevel(attrVal);
}

/** Level for an action with no matching skill: the rules' "unskilled" formula, else the default attribute. */
export function untrainedLevel(attrVal) {
    const f = rules().unskilled;
    const v = evalFormula(f, attrVal, null);
    const da = defaultAttr();
    return v === null ? { level: attrVal[da] ?? null, via: da } : { level: Math.floor(v), via: `untrained (${f})` };
}

/** Computed abilities: level, roll source, parsed damage. */
export function computeAbilities(abilities, skills, attrVal, thrust, swing) {
    return abilities.map(ab => {
        const use = abilityUse(ab);
        const fx = abilityFx(ab);
        const { level, via } = abilityLevel(ab, skills, attrVal);
        const dice = weaponDamage(expandFormulas(ab.damage, attrVal), thrust, swing);
        const dmg = fx === 'damage' ? dice : null;
        const amount = ['heal', 'fp', 'poison', 'bleed'].includes(fx) && dice ? { n: dice.n, sides: dice.sides, add: dice.add, text: dice.text.replace(/ \S+$/, '') } : null;
        const stat = ABILITY_STATS.includes(ab.stat) ? ab.stat : 'all';
        const resist = resistAttrs().includes(ab.resist) ? ab.resist : '';
        const duration = Math.max(1, Math.round(num(ab.duration, 0)) || (fx === 'stun' ? 1 : 3));
        const mod = Math.round(num(ab.mod, 0)) || (fx === 'debuff' ? -2 : fx === 'buff' ? 2 : fx === 'haste' ? 1 : 0);
        // a DC: the target rolls its resist stat against this number (no caster roll); save = what a made save leaves
        const dcRaw = String(ab.dc ?? '').trim();
        const dc = dcRaw === '' ? null : (Number.isFinite(Number(dcRaw)) ? Number(dcRaw) : evalFormula(dcRaw, attrVal, null));
        const save = SAVE_RESULTS.includes(ab.save) ? ab.save : 'none';
        const resource = resourceOf(ab.resource);
        const out = { ...ab, use, fx, aim: abilityAim(ab), level, via, dmg, amount, stat, mod, duration, resist, range: num(ab.range), cost: Math.max(0, num(ab.cost)), resource, dc: dc === null ? null : Math.floor(dc), save,
            castTime: Math.max(0, Math.round(num(ab.castTime, 0))), hits: ab.hits === 'auto' ? 'auto' : 'roll' };
        out.fxText = fxText(out);
        return out;
    });
}

/** The resources abilities can spend (the rules' list; none = the stamina value, under its label). */
export function resourceNames() {
    const list = rules().resources.map(x => x.name);
    return list.length ? list : (role('stamina') ? [keyLabel(role('stamina'))] : []);
}

/** The resource an ability spends: the one it names, else the first. '' when there are none. */
export function resourceOf(name) {
    const list = resourceNames();
    const n = String(name ?? '').trim();
    return list.find(x => x.toLowerCase() === n.toLowerCase()) || list[0] || '';
}

/** "Range 25" / "Reach 1" / "" for notes the combat system reads. */
export function abilityReachText(a) {
    if (a.use === 'ranged') return a.range > 0 ? `Range ${a.range}` : '';
    if (a.use === 'melee') return `Reach ${a.range > 0 ? a.range : 1}`;
    return a.range > 0 ? `Range ${a.range}` : '';
}
