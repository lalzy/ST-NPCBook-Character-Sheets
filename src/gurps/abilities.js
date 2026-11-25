// Abilities: spells, psionics, powers or anything else the user calls them.
// Each one is rolled against a skill or attribute and can work as an attack (ranged / melee) beside inventory weapons.
import { SKILL_ATTRS, ABILITY_USES, ABILITY_FX, ABILITY_AIMS, ABILITY_STATS, RESIST_ATTRS } from './rules.js';
import { weaponDamage } from './dice.js';
import { num } from '../utils/number.js';

const lc = (s) => String(s ?? '').trim().toLowerCase();

export const abilityUse = (ab) => (ABILITY_USES.includes(ab?.use) ? ab.use : 'ranged');
export const isAttackAbility = (ab) => abilityUse(ab) !== 'utility';

/** Mechanical effect. Sheets from before effects existed: damage for attacks, none for utility. */
export const abilityFx = (ab) => (ABILITY_FX.includes(ab?.fx) ? ab.fx : (abilityUse(ab) === 'utility' ? 'none' : 'damage'));

/** Default target for an effect: helpful effects go on allies, the rest on enemies. */
export const defaultAim = (fx) => (['heal', 'fp', 'buff'].includes(fx) ? 'ally' : fx === 'none' ? 'any' : 'enemy');
export const abilityAim = (ab) => (ABILITY_AIMS.includes(ab?.aim) ? ab.aim : defaultAim(abilityFx(ab)));

/** Short human text of what an ability does, e.g. "heal 2d", "debuff −2 defense, 3 turns", "stun 1 turn". */
export function fxText(a) {
    const turns = (n) => `${n} turn${n === 1 ? '' : 's'}`;
    const amount = a.amount ? a.amount.text : '';
    switch (a.fx) {
        case 'damage': return a.dmg ? a.dmg.text : 'damage (none set)';
        case 'heal': return `heal ${amount || '?'} HP`;
        case 'fp': return `restore ${amount || '?'} FP`;
        case 'buff': case 'debuff': return `${a.fx} ${a.mod >= 0 ? '+' : ''}${a.mod} ${a.stat}, ${turns(a.duration)}`;
        case 'stun': return `stun ${turns(a.duration)}`;
        case 'disarm': return 'disarm';
        default: return 'no automatic effect';
    }
}

/**
 * The level an ability is rolled at.
 * skill = an attribute (IQ, Will…) → that value; = a skill on the sheet → its level;
 * empty → a skill named like the ability (a spell is just a skill); otherwise DX-5.
 */
export function abilityLevel(ab, skills, attrVal) {
    const link = String(ab.skill ?? '').trim();
    if (SKILL_ATTRS.includes(link)) return { level: attrVal[link], via: link };
    const byName = (n) => skills.find(s => lc(s.name) === lc(n) && s.level !== null);
    const sk = link ? byName(link) : byName(ab.name);
    if (sk) return { level: sk.level, via: sk.name };
    return { level: attrVal.DX - 5, via: 'DX-5 default' };
}

/** Computed abilities: level, roll source, parsed damage. */
export function computeAbilities(abilities, skills, attrVal, thrust, swing) {
    return abilities.map(ab => {
        const use = abilityUse(ab);
        const fx = abilityFx(ab);
        const { level, via } = abilityLevel(ab, skills, attrVal);
        const dice = weaponDamage(ab.damage, thrust, swing);
        const dmg = fx === 'damage' ? dice : null;
        const amount = ['heal', 'fp'].includes(fx) && dice ? { n: dice.n, add: dice.add, text: dice.text.replace(/ \S+$/, '') } : null;
        const stat = ABILITY_STATS.includes(ab.stat) ? ab.stat : 'all';
        const resist = RESIST_ATTRS.includes(ab.resist) ? ab.resist : '';
        const duration = Math.max(1, Math.round(num(ab.duration, 0)) || (fx === 'stun' ? 1 : 3));
        const mod = Math.round(num(ab.mod, 0)) || (fx === 'debuff' ? -2 : fx === 'buff' ? 2 : 0);
        const out = { ...ab, use, fx, aim: abilityAim(ab), level, via, dmg, amount, stat, mod, duration, resist, range: num(ab.range), cost: Math.max(0, num(ab.cost)), pts: num(ab.pts) };
        out.fxText = fxText(out);
        return out;
    });
}

/** "Range 25" / "Reach 1" / "" for notes the combat system reads. */
export function abilityReachText(a) {
    if (a.use === 'ranged') return a.range > 0 ? `Range ${a.range}` : '';
    if (a.use === 'melee') return `Reach ${a.range > 0 ? a.range : 1}`;
    return a.range > 0 ? `Range ${a.range}` : '';
}
