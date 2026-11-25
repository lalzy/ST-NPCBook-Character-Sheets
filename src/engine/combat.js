// Combat actions for the Roll Dice "Combat" mode. Every rule number comes from the user's rules config.
import { rules, woundMult, defaultAttr } from '../rules/ruleset.js';
import { evalFormula } from '../rules/formula.js';
import { normalizeSheet } from './sheet.js';
import { compute } from './compute.js';
import { parseDice, weaponDamage } from './dice.js';
import { num } from '../utils/number.js';
import { abilityReachText, untrainedLevel } from './abilities.js';

const isWeapon = (e) => String(e.name || '').trim() && /weapon|shield|ranged|melee/i.test(String(e.category || ''));

/** Parry / block level from the rules' formula, or null when the rules have none. */
const defense = (formula, skill, bonus) => {
    const v = evalFormula(formula, { skill }, null);
    return v === null ? null : Math.floor(v) + bonus;
};

function weaponActions(sh, c, skillLevel, defBonus) {
    const actions = [];
    const R = rules();
    for (const w of sh.equipment.filter(isWeapon)) {
        const linked = String(w.skill || '').trim();
        let level = linked ? skillLevel(linked) : null;
        if (level === null) level = skillLevel(w.name); // weapon named after its skill
        let usedSkill = linked || w.name;
        if (level === null) ({ level, via: usedSkill } = untrainedLevel(c.attrVal));
        if (level === null) continue;
        const isShield = /shield/i.test(String(w.category || ''));
        const dmg = weaponDamage(w.stat, c.thrust, c.swing);
        if (!isShield || dmg) actions.push({ group: 'Attack', kind: 'roll', name: `${w.name} Attack`, target: level, note: usedSkill });
        if (dmg) actions.push({ group: 'Damage', kind: 'damage', name: `${w.name} Damage`, n: dmg.n, add: dmg.add, type: dmg.type, mult: woundMult(dmg.type), note: dmg.text });
        if (isShield) {
            const t = defense(R.block, level, defBonus);
            if (t !== null) actions.push({ group: 'Defense', kind: 'roll', name: `Block (${w.name})`, target: t });
        } else if (!/ranged/i.test(String(w.category || ''))) {
            const t = defense(R.parry, level, defBonus);
            if (t !== null) actions.push({ group: 'Defense', kind: 'roll', name: `Parry (${w.name})`, target: t });
        }
    }
    return actions;
}

function unarmedActions(c, skillLevel, defBonus) {
    const R = rules();
    if (!R.unarmedAttacks.length) return [];
    const ua = R.unarmedSkills.map(s => ({ ...s, lvl: skillLevel(s.name) })).filter(x => x.lvl !== null).sort((a, b) => b.lvl - a.lvl)[0];
    const da = defaultAttr();
    const baseLvl = ua ? ua.lvl : (c.attrVal[da] ?? null);
    if (baseLvl === null) return [];
    const thr = parseDice(c.thrust);
    const over = ua ? ua.lvl - num(c.attrVal[da]) : null;
    const perDie = ua ? (ua.bonus.find(b => over >= b.over)?.perDie ?? 0) : 0;
    const actions = [];
    for (const atk of R.unarmedAttacks) {
        actions.push({ group: 'Attack', kind: 'roll', name: atk.name, target: baseLvl + atk.levelMod, note: `${ua ? ua.name : da}${atk.levelMod ? (atk.levelMod > 0 ? `+${atk.levelMod}` : atk.levelMod) : ''}` });
        const dmg = weaponDamage(atk.damage, c.thrust, c.swing);
        if (dmg) {
            const bonus = /^(thr|sw)/i.test(atk.damage) && thr ? perDie * thr.n : 0;
            actions.push({ group: 'Damage', kind: 'damage', name: `${atk.name} Damage`, n: dmg.n, add: dmg.add + bonus, type: dmg.type, mult: woundMult(dmg.type) });
        }
    }
    if (ua) {
        const t = defense(R.parry, ua.lvl, defBonus);
        if (t !== null) actions.push({ group: 'Defense', kind: 'roll', name: `Parry (${ua.name})`, target: t });
    }
    return actions;
}

/**
 * Abilities (spells, psionics, powers…). Every ability becomes a usable option in Combat Mode:
 * a roll entry flagged `ability` carrying how it is delivered (use: ranged / melee can be defended against,
 * utility cannot), what it does (fx) and on whom (aim), plus a damage entry for damage abilities.
 * An ability with fx none is still rolled in combat; the narration or the user decides what it does.
 */
function abilityActions(c) {
    const actions = [];
    for (const a of c.abilities.filter(x => String(x.name || '').trim() && x.level !== null)) {
        const kind = String(a.kind || '').trim() || 'ability';
        const where = abilityReachText(a);
        const note = [kind, a.via, a.fxText, a.resist ? `resisted by ${a.resist}` : '', where, a.cost ? `${a.cost} FP` : ''].filter(Boolean).join(' · ');
        actions.push({
            group: 'Abilities', kind: 'roll', name: a.name, target: a.level, note, ability: kind,
            attack: true, // usable in combat (older readers skip attack: false)
            use: a.use, fx: a.fx, aim: a.aim, resist: a.resist,
            stat: a.stat, mod: a.mod, duration: a.duration,
            amount: a.amount ? { n: a.amount.n, add: a.amount.add } : null,
            ranged: a.use !== 'melee',
            range: a.use === 'ranged' ? (a.range > 0 ? a.range : null) : a.use === 'utility' ? (a.range > 0 ? a.range : 1000) : null,
            reach: a.use === 'melee' ? (a.range > 0 ? a.range : 1) : null,
            cost: a.cost, effect: String(a.effect || ''),
        });
        if (a.dmg) actions.push({ group: 'Damage', kind: 'damage', name: `${a.name} Damage`, n: a.dmg.n, add: a.dmg.add, type: a.dmg.type, mult: woundMult(a.dmg.type), note: a.dmg.text, ability: kind });
    }
    return actions;
}

function skillActions(c) {
    // Skills & spells (magic is just a skill)
    return [...c.skills].filter(x => String(x.name || '').trim() && x.level !== null).sort((a, b) => a.name.localeCompare(b.name))
        .map(s => ({ group: 'Skills & spells', kind: 'roll', name: s.name, target: s.level }));
}

/**
 * Combat actions for the Roll Dice "Combat" mode.
 * kinds: 'roll' (vs target) and 'damage' (dice).
 */
export function combatActions(sheet) {
    const sh = normalizeSheet(sheet);
    const c = compute(sh);
    const skillLevel = (name) => {
        const s = c.skills.find(x => String(x.name).trim().toLowerCase() === String(name || '').trim().toLowerCase());
        return s && s.level !== null ? s.level : null;
    };
    const traitNames = sh.traits.map(t => String(t.name || '').trim().toLowerCase());
    const defBonus = rules().defenseTraits.reduce((sum, d) => sum + (traitNames.some(n => n.startsWith(d.name.toLowerCase())) ? d.bonus : 0), 0);
    return [
        ...weaponActions(sh, c, skillLevel, defBonus),
        ...unarmedActions(c, skillLevel, defBonus),
        ...abilityActions(c),
        ...(c.dodge !== null ? [{ group: 'Defense', kind: 'roll', name: 'Dodge', target: c.dodge + defBonus }] : []),
        ...skillActions(c),
    ];
}
