// Combat actions for the Roll Dice "Combat" mode.
import { WOUND_MULT, UNARMED_SKILLS } from './rules.js';
import { normalizeSheet } from './sheet.js';
import { compute } from './compute.js';
import { parseDice, weaponDamage } from './dice.js';
import { abilityReachText } from './abilities.js';

const isWeapon = (e) => String(e.name || '').trim() && /weapon|shield|ranged|melee/i.test(String(e.category || ''));

function weaponActions(sh, c, skillLevel, defBonus) {
    const actions = [];
    for (const w of sh.equipment.filter(isWeapon)) {
        const linked = String(w.skill || '').trim();
        let level = linked ? skillLevel(linked) : null;
        if (level === null) level = skillLevel(w.name); // weapon named after its skill
        const usedSkill = level !== null ? (linked || w.name) : `DX-5 default`;
        if (level === null) level = c.attrs.DX - 5;
        const isShield = /shield/i.test(String(w.category || ''));
        const dmg = weaponDamage(w.stat, c.thrust, c.swing);
        if (!isShield || dmg) actions.push({ group: 'Attack', kind: 'roll', name: `${w.name} Attack`, target: level, note: usedSkill });
        if (dmg) actions.push({ group: 'Damage', kind: 'damage', name: `${w.name} Damage`, n: dmg.n, add: dmg.add, type: dmg.type, mult: WOUND_MULT[dmg.type] ?? 1, note: dmg.text });
        if (isShield) actions.push({ group: 'Defense', kind: 'roll', name: `Block (${w.name})`, target: Math.floor(level / 2) + 3 + defBonus });
        else if (!/ranged/i.test(String(w.category || ''))) actions.push({ group: 'Defense', kind: 'roll', name: `Parry (${w.name})`, target: Math.floor(level / 2) + 3 + defBonus });
    }
    return actions;
}

function unarmedActions(c, skillLevel, defBonus) {
    const ua = UNARMED_SKILLS.map(n => ({ n, lvl: skillLevel(n) })).find(x => x.lvl !== null);
    const punchLvl = ua ? ua.lvl : c.attrs.DX;
    const thr = parseDice(c.thrust) || { n: 1, add: 0 };
    // Unarmed skill damage bonus, per die of thrust (Brawling: +1 at DX+2; Boxing/Karate: +1 at DX+1, +2 at DX+2)
    const over = ua ? ua.lvl - c.attrs.DX : -99;
    const perDie = ua?.n === 'Brawling' ? (over >= 2 ? 1 : 0) : ua ? (over >= 2 ? 2 : over >= 1 ? 1 : 0) : 0;
    const bonus = perDie * thr.n;
    const actions = [
        { group: 'Attack', kind: 'roll', name: 'Punch', target: punchLvl, note: ua ? ua.n : 'DX' },
        { group: 'Attack', kind: 'roll', name: 'Kick', target: punchLvl - 2, note: `${ua ? ua.n : 'DX'}-2` },
        { group: 'Damage', kind: 'damage', name: 'Punch Damage', n: thr.n, add: thr.add - 1 + bonus, type: 'cr', mult: 1 },
        { group: 'Damage', kind: 'damage', name: 'Kick Damage', n: thr.n, add: thr.add + bonus, type: 'cr', mult: 1 },
    ];
    if (ua) actions.push({ group: 'Defense', kind: 'roll', name: `Parry (${ua.n})`, target: Math.floor(ua.lvl / 2) + 3 + defBonus });
    return actions;
}

/**
 * Abilities (spells, psionics, powers…). Every ability becomes a usable option in GURPS Combat:
 * a roll entry flagged `ability` carrying how it is delivered (use: ranged / melee can be defended against,
 * utility cannot), what it does (fx) and on whom (aim), plus a damage entry for damage abilities.
 * An ability with fx none is still rolled in combat; the narration or the user decides what it does.
 */
function abilityActions(c) {
    const actions = [];
    for (const a of c.abilities.filter(x => String(x.name || '').trim())) {
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
        if (a.dmg) actions.push({ group: 'Damage', kind: 'damage', name: `${a.name} Damage`, n: a.dmg.n, add: a.dmg.add, type: a.dmg.type, mult: WOUND_MULT[a.dmg.type] ?? 1, note: a.dmg.text, ability: kind });
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
 * kinds: 'roll' (3d6 vs target) and 'damage' (dice).
 */
export function combatActions(sheet) {
    const sh = normalizeSheet(sheet);
    const c = compute(sh);
    const skillLevel = (name) => {
        const s = c.skills.find(x => String(x.name).trim().toLowerCase() === String(name || '').trim().toLowerCase());
        return s && s.level !== null ? s.level : null;
    };
    const combatReflexes = sh.traits.some(t => /combat reflexes/i.test(String(t.name || '')));
    const defBonus = combatReflexes ? 1 : 0;
    return [
        ...weaponActions(sh, c, skillLevel, defBonus),
        ...unarmedActions(c, skillLevel, defBonus),
        ...abilityActions(c),
        { group: 'Defense', kind: 'roll', name: 'Dodge', target: c.dodge + defBonus },
        ...skillActions(c),
    ];
}
