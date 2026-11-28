// Combat actions for the Roll Dice "Combat" mode. Every rule number comes from the user's rules config.
import { rules, woundMult, defaultAttr, skillAttrs } from '../rules/ruleset.js';
import { evalFormula } from '../rules/formula.js';
import { normalizeSheet } from './sheet.js';
import { compute } from './compute.js';
import { parseDice, weaponDamage } from './dice.js';
import { num } from '../utils/number.js';
import { abilityReachText, untrainedLevel } from './abilities.js';
import { itemBlocks, isEquipped, isCarried, modSum, ammoOf, poolCostsOf, expandFormulas } from './items.js';

/** Parry / block level from the rules' formula, or null when the rules have none. */
const defense = (formula, skill, bonus) => {
    const v = evalFormula(formula, { skill }, null);
    return v === null ? null : Math.floor(v) + bonus;
};

const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/**
 * The skill a weapon uses, in this order: its skill field; a skill named like the item; the rules' categorySkills
 * for its category; a skill named like a word of its category ("shield" → Shield); a skill named like a word of its
 * name ("Large Shield" → Shield). `skills`: the computed skills ([{ name, level }]). { level, skill } or null.
 */
export function weaponSkill(w, skills) {
    const tryName = (n) => {
        const key = String(n || '').trim().toLowerCase();
        const s = key ? skills.find(x => String(x.name || '').trim().toLowerCase() === key && x.level !== null) : null;
        return s ? { level: s.level, skill: String(s.name).trim() } : null;
    };
    const cat = words(w.category);
    return tryName(String(w.skill || '').trim())
        || tryName(String(w.name || '').trim())
        || rules().categorySkills.filter(x => cat.includes(x.category) || String(w.category || '').trim().toLowerCase() === x.category).map(x => tryName(x.skill)).find(Boolean)
        || cat.map(tryName).find(Boolean)
        || words(w.name).map(tryName).find(Boolean)
        || null;
}

/**
 * The level an item's attack or block rolls at. roll fixed: the block's own number or formula. Otherwise the block's
 * skill (an attribute / secondary key or a skill on the sheet), else weaponSkill() for the item, else the untrained level.
 */
function itemLevel(b, e, c) {
    if (b.roll === 'fixed') {
        const raw = String(b.level ?? '').trim();
        const v = raw === '' ? null : (Number.isFinite(Number(raw)) ? Number(raw) : evalFormula(raw.replace(/^\[|\]$/g, ''), c.attrVal, null));
        return v === null ? { level: null, via: '' } : { level: Math.floor(v), via: String(e.name || 'item') };
    }
    const link = String(b.skill || '').trim();
    if (link && skillAttrs().includes(link)) return { level: c.attrVal[link] ?? null, via: link };
    const found = weaponSkill({ ...e, skill: link }, c.skills);
    if (found) return { level: found.level, via: found.skill };
    const u = untrainedLevel(c.attrVal);
    return { level: u.level, via: u.via };
}

const rangeOf = (b) => (b.use === 'melee' ? null : num(b.range) > 0 ? num(b.range) : (b.use === 'utility' ? 1000 : null));
const reachOf = (b) => (b.use === 'melee' ? (num(b.range) > 0 ? num(b.range) : 1) : null);

/**
 * Attacks, parries and blocks from item blocks (old items get blocks from their category / stat, see items.js).
 * Every Attack block of a carried item is an attack (an item can have any number); a melee attack gives a Parry
 * unless the item has a Block; every block-kind Defense block of an equipped item gives a Block. Ammo (Consumes
 * blocks) is sent with the attack; an attack whose ammo has run out is left out. Modifiers are added.
 */
function weaponActions(sh, c, skillLevel, defBonus) {
    const actions = [];
    const R = rules();
    const gear = c.gear || { parry: 0, block: 0 };
    const mods = c.mods || [];
    sh.equipment.forEach((w, i) => {
        const name = String(w.name || '').trim();
        if (!name || !isCarried(w)) return;
        const blocks = itemBlocks(w);
        const attacks = blocks.filter(b => b.type === 'attack');
        const blocksDef = blocks.filter(b => b.type === 'defense' && b.kind === 'block');
        const ammo = ammoOf(sh.equipment, w);
        const noAmmo = ammo.some(x => x.left < x.per);
        const costs = poolCostsOf(w); // resource pools each attack spends (FP, mana, HP…): sent like an ability's cost
        let parried = false;
        attacks.forEach((b, k) => {
            const { level, via } = itemLevel(b, w, c);
            if (level === null && b.hits !== 'auto') return;
            const label = String(b.label || '').trim();
            const named = attacks.length > 1 || label;
            const base = attacks.length > 1 ? `${name} ${label || `Attack ${k + 1}`}` : `${name} ${label}`;
            const atkName = named ? base : `${name} Attack`;
            const dmgName = named ? `${base} Damage` : `${name} Damage`;
            const toHit = modSum(mods, 'item:attack', i) + modSum(mods, 'item:both', i) + modSum(mods, 'attack');
            const dmgAdd = modSum(mods, 'item:damage', i) + modSum(mods, 'item:both', i) + modSum(mods, 'damage');
            const dmg = weaponDamage(expandFormulas(b.damage, c.attrVal), c.thrust, c.swing);
            if (!noAmmo) {
                actions.push({
                    group: 'Attack', kind: 'roll', name: atkName, target: (level ?? 0) + toHit, note: via,
                    item: name, use: b.use || 'melee', ranged: b.use !== 'melee', range: rangeOf(b), reach: reachOf(b), hits: b.hits === 'auto' ? 'auto' : 'roll',
                    ...(ammo.length ? { ammo } : {}),
                    ...(costs.length ? { cost: costs[0].per, resource: costs[0].pool, costs } : {}),
                });
                if (dmg) actions.push({ group: 'Damage', kind: 'damage', name: dmgName, n: dmg.n, sides: dmg.sides, add: dmg.add + dmgAdd, type: dmg.type, mult: woundMult(dmg.type), note: String(b.damage || '').trim() || dmg.text, item: name, ...(dmg.more ? { more: dmg.more } : {}), ...(dmg.div ? { div: dmg.div } : {}) });
            }
            if (b.use === 'melee' && !parried && !blocksDef.length && level !== null) {
                parried = true;
                const t = defense(R.parry, level, defBonus + gear.parry);
                if (t !== null) actions.push({ group: 'Defense', kind: 'roll', name: `Parry (${name})`, target: t, item: name, def: 'parry' });
            }
        });
        if (isEquipped(w)) {
            blocksDef.forEach((b, k) => {
                const { level } = itemLevel(b, w, c);
                if (level === null) return;
                const t = defense(R.block, level, defBonus + gear.block + num(b.value) + modSum(mods, 'item:block', i));
                if (t !== null) actions.push({ group: 'Defense', kind: 'roll', name: blocksDef.length > 1 ? `Block ${k + 1} (${name})` : `Block (${name})`, target: t, item: name, def: 'block' });
            });
        }
    });
    return actions;
}

function unarmedActions(c, skillLevel, defBonus) {
    const R = rules();
    if (!R.unarmedAttacks.length) return [];
    const ua = R.unarmedSkills.map(s => ({ ...s, lvl: skillLevel(s.name) })).filter(x => x.lvl !== null).sort((a, b) => b.lvl - a.lvl)[0];
    const da = defaultAttr();
    // no unarmed skill: the rules' unarmedLevel formula, else the default attribute
    const fromRule = R.unarmedLevel ? evalFormula(R.unarmedLevel, c.attrVal, null) : null;
    const baseLvl = ua ? ua.lvl : fromRule !== null ? Math.floor(fromRule) : (c.attrVal[da] ?? null);
    if (baseLvl === null) return [];
    const thr = parseDice(c.thrust);
    const over = ua ? ua.lvl - num(c.attrVal[da]) : null;
    const perDie = ua ? (ua.bonus.find(b => over >= b.over)?.perDie ?? 0) : 0;
    const actions = [];
    for (const atk of R.unarmedAttacks) {
        actions.push({ group: 'Attack', kind: 'roll', name: atk.name, unarmed: true, target: baseLvl + atk.levelMod, note: `${ua ? ua.name : fromRule !== null ? R.unarmedLevel : da}${atk.levelMod ? (atk.levelMod > 0 ? `+${atk.levelMod}` : atk.levelMod) : ''}` });
        const dmg = weaponDamage(atk.damage, c.thrust, c.swing);
        if (dmg) {
            const bonus = /^(thr|sw)/i.test(atk.damage) && thr ? perDie * thr.n : 0;
            actions.push({ group: 'Damage', kind: 'damage', name: `${atk.name} Damage`, n: dmg.n, sides: dmg.sides, add: dmg.add + bonus, type: dmg.type, mult: woundMult(dmg.type), ...(dmg.more ? { more: dmg.more } : {}) });
        }
    }
    if (ua) {
        const t = defense(R.parry, ua.lvl, defBonus + (c.gear?.parry || 0));
        if (t !== null) actions.push({ group: 'Defense', kind: 'roll', name: `Parry (${ua.name})`, target: t, def: 'parry' });
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
    const own = c.abilities.filter(x => String(x.name || '').trim() && x.level !== null);
    // abilities stored on equipped items, named "Fireball (Oak Wand)"; an empty charge pool leaves one out
    const fromItems = (c.itemAbilities || []).filter(x => x.level !== null && !x.empty).map(x => ({ ...x, name: `${x.name} (${x.item})` }));
    for (const a of [...own, ...fromItems]) {
        const kind = String(a.kind || '').trim() || 'ability';
        const where = abilityReachText(a);
        const note = [kind, a.via, a.fxText, a.resist ? `${a.dc !== null ? `${a.resist} save DC ${a.dc}` : `resisted by ${a.resist}`}` : '', where, a.cost ? `${a.cost} ${a.resource || ''}`.trim() : ''].filter(Boolean).join(' · ');
        actions.push({
            group: 'Abilities', kind: 'roll', name: a.name, target: a.level, note, ability: kind,
            attack: true, // usable in combat (older readers skip attack: false)
            use: a.use, fx: a.fx, aim: a.aim, resist: a.resist,
            stat: a.stat, mod: a.mod, duration: a.duration,
            amount: a.amount ? { n: a.amount.n, sides: a.amount.sides, add: a.amount.add } : null,
            ranged: a.use !== 'melee',
            range: a.use === 'ranged' ? (a.range > 0 ? a.range : null) : a.use === 'utility' ? (a.range > 0 ? a.range : 1000) : null,
            reach: a.use === 'melee' ? (a.range > 0 ? a.range : 1) : null,
            cost: a.cost, resource: a.resource || '', dc: a.dc, save: a.save, effect: String(a.effect || ''),
            castTime: a.castTime || 0, hits: a.hits || 'roll',
            defendWith: String(a.defendWith || '').split(/[,;/]+/).map(x => x.trim().toLowerCase()).filter(Boolean),
            ...(a.item !== undefined ? { item: a.item, ...(a.pool ? { charges: { pool: a.pool.name, left: a.pool.left, max: a.pool.max } } : {}) } : {}),
        });
        if (a.dmg) actions.push({ group: 'Damage', kind: 'damage', name: `${a.name} Damage`, n: a.dmg.n, sides: a.dmg.sides, add: a.dmg.add, type: a.dmg.type, mult: woundMult(a.dmg.type), note: a.dmg.text, ability: kind, ...(a.dmg.more ? { more: a.dmg.more } : {}), ...(a.dmg.div ? { div: a.dmg.div } : {}) });
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
        ...(c.dodge !== null ? [{ group: 'Defense', kind: 'roll', name: 'Dodge', target: c.dodge + defBonus, def: 'dodge' }] : []),
        ...skillActions(c),
    ];
}
