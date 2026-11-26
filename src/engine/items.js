// Inventory items built from blocks. An item is name, qty, weight, value, category (a free-text label only), equipped,
// effect (story notes for the AI) and any number of blocks, each optional and repeatable:
//   attack    { type, label, roll: skill|fixed, skill, level, damage, use: melee|ranged|utility, range, hits: roll|auto }
//   defense   { type, kind: armor|block, value, slots, skill }
//   modifier  { type, amount, target, when: equipped|carried|always }
//   ability   { type, …the fields of an ability, roll: skill|fixed, level }
//   charges   { type, name, left, max }
//   consumes  { type, from: item|pool, item, pool, per }  (an item such as arrows, or a resource pool such as FP / mana / HP)
// Nothing here depends on a rule set: lists (attributes, skills, pools) come from the active rules.
// Items saved before blocks existed (no `blocks` array, e.g. made by the LLM) get blocks derived from their old
// category / stat / skill fields, so they keep working exactly as before.
import { rules, attrKeys, secondaryList, role, statLabel } from '../rules/ruleset.js';
import { evalFormula } from '../rules/formula.js';
import { resourceNames } from './abilities.js';
import { num } from '../utils/number.js';

export const BLOCK_TYPES = ['attack', 'defense', 'modifier', 'ability', 'charges', 'consumes'];
export const DEFENSE_KINDS = ['armor', 'block'];
export const MOD_WHEN = ['equipped', 'carried', 'always'];
/** Fixed modifier targets; attributes, secondary stats and skills are added from the rules and the sheet. */
export const MOD_TARGETS_ITEM = ['item:attack', 'item:damage', 'item:both', 'item:armor', 'item:block'];
export const MOD_TARGETS_ALL = ['attack', 'damage', 'armor', 'dodge', 'parry', 'block', 'armorClass'];
/** Armor slot suggestions (free text; any rule set may use its own names). */
export const SLOT_SUGGESTIONS = ['head', 'face', 'neck', 'shoulders', 'torso', 'arms', 'hands', 'groin', 'legs', 'feet', 'shield arm', 'all'];

const lc = (s) => String(s ?? '').trim().toLowerCase();


export const NEW_BLOCK = {
    attack: () => ({ type: 'attack', label: '', roll: 'skill', skill: '', level: '', damage: '', use: 'melee', range: 0, hits: 'roll' }),
    defense: () => ({ type: 'defense', kind: 'armor', value: '', slots: '', skill: '' }),
    modifier: () => ({ type: 'modifier', amount: '', target: 'item:attack', when: 'equipped' }),
    ability: () => ({ type: 'ability', name: '', kind: '', roll: 'fixed', level: '', skill: '', use: 'ranged', fx: 'damage', aim: '', damage: '', stat: '', mod: 0, duration: 0, resist: '', dc: '', save: 'none', defendWith: '', castTime: 0, hits: 'roll', range: 0, cost: 0, resource: '', effect: '' }),
    charges: () => ({ type: 'charges', name: 'Charges', left: '', max: '' }),
    consumes: () => ({ type: 'consumes', from: 'item', item: '', pool: '', per: 1 }),
};

/** Does an item's category match one of `words` (whole words, case ignored)? An empty list matches any item. */
function categoryIs(e, list) {
    if (!list.length) return true;
    const cat = lc(e?.category);
    return list.some(w => cat.split(/[^a-z0-9]+/).includes(w) || cat === w);
}

/** Old-style armor item: the rules' armorCategories, else categories with "armor" in them. */
function legacyArmorItem(e) {
    const list = rules().armorCategories;
    if (!list.length) return /armou?r/.test(lc(e?.category));
    return categoryIs(e, list);
}

const parseDR = (stat) => { const m = String(stat ?? '').match(/\b(?:DR|armou?r)\s*(\d+)/i); return m ? Number(m[1]) : 0; };

function legacyCovers(stat) {
    const m = /\bcovers?\s*:?\s*([^;.()\d]+)/i.exec(String(stat ?? ''));
    if (!m) return [];
    return m[1].split(/\s*(?:,|\/|&|\band\b)\s*/i).map(x => x.trim().toLowerCase()).filter(Boolean);
}

const hasDice = (stat) => /^\s*(?:sw|swing|thr|thrust|\d+d\d*|[+-]?\d+(?!\s*(?:d|%)))/i.test(String(stat ?? '')) && !/^\s*(?:DR|armou?r|DB|AC)\b/i.test(String(stat ?? ''));

/** Blocks for an item saved before blocks existed, worked out from its category, stat and skill (the old behavior). */
export function legacyBlocks(e) {
    const out = [];
    const cat = String(e?.category || '');
    const stat = String(e?.stat || '');
    const weapon = String(e?.name || '').trim() && /weapon|shield|ranged|melee/i.test(cat);
    const shield = /shield/i.test(cat);
    if (weapon) {
        if (!shield || hasDice(stat)) out.push({ ...NEW_BLOCK.attack(), skill: String(e.skill || ''), damage: stat, use: /ranged/i.test(cat) ? 'ranged' : 'melee' });
        if (shield) out.push({ ...NEW_BLOCK.defense(), kind: 'block', value: '', skill: String(e.skill || '') });
    }
    if (legacyArmorItem(e) && parseDR(stat) > 0) out.push({ ...NEW_BLOCK.defense(), kind: 'armor', value: parseDR(stat), slots: legacyCovers(stat).join(', ') });
    for (const g of rules().gearBonuses || []) {
        if (!categoryIs(e, g.categories)) continue;
        const rx = new RegExp(`(?:^|[^A-Za-z0-9])${g.word.replace(/[-]/g, '\\-')}\\s*:?\\s*([+-]?\\s*\\d+(?:\\.\\d+)?)(?![A-Za-z0-9])`, 'i');
        const m = rx.exec(stat);
        if (!m) continue;
        const n = Number(m[1].replace(/\s+/g, ''));
        for (const k of g.adds) out.push({ ...NEW_BLOCK.modifier(), amount: n, target: k, when: 'carried' });
    }
    return out;
}

/** An item's blocks: its own list, or ones derived from old fields. */
export const itemBlocks = (e) => (Array.isArray(e?.blocks) ? e.blocks.filter(b => b && BLOCK_TYPES.includes(b.type)) : legacyBlocks(e));

/** Carried: qty above 0. Equipped: carried and not switched off. */
export const isCarried = (e) => num(e?.qty, 1) > 0;
export const isEquipped = (e) => isCarried(e) && e?.equipped !== false;

/** Is a modifier active for its item right now? */
export const modActive = (e, b) => (b.when === 'always' ? true : b.when === 'carried' ? isCarried(e) : isEquipped(e));

/** Every active modifier on the sheet: [{ item index, target, amount }]. */
export function activeMods(equipment) {
    const out = [];
    (equipment || []).forEach((e, i) => {
        for (const b of itemBlocks(e)) if (b.type === 'modifier' && modActive(e, b) && num(b.amount)) out.push({ i, target: String(b.target || ''), amount: num(b.amount) });
    });
    return out;
}

/** Sum of the active modifiers to `target` (optionally only from item `i`). */
export const modSum = (mods, target, i = null) => mods.filter(m => m.target === target && (i === null || m.i === i)).reduce((s, m) => s + m.amount, 0);

/** Modifier targets to offer: this item, defenses, then every attribute, secondary stat and skill of the rules / sheet. */
export function modTargets(skills = []) {
    return [
        ...MOD_TARGETS_ITEM,
        ...MOD_TARGETS_ALL,
        ...attrKeys().map(k => `attr:${k}`),
        ...secondaryList().map(x => `sec:${x.key}`),
        ...[...new Set(skills.map(s => String(s.name || '').trim()).filter(Boolean))].map(n => `skill:${n}`),
    ];
}

/** Armor slots of a defense block: "torso, arms" → ['torso', 'arms']. */
export const slotList = (b) => String(b?.slots ?? '').split(/\s*(?:,|\/|&|\band\b)\s*/i).map(x => x.trim().toLowerCase()).filter(Boolean);

/** Find an inventory item by name (case ignored). */
export const findItem = (equipment, name) => (equipment || []).find(e => lc(e.name) && lc(e.name) === lc(name)) || null;

/** Ammo a weapon uses: [{ item, per, left }] (left = that item's qty; 0 when it is missing). */
export function ammoOf(equipment, e) {
    return itemBlocks(e).filter(b => b.type === 'consumes' && b.from !== 'pool' && String(b.item || '').trim()).map(b => {
        const src = findItem(equipment, b.item);
        return { item: String(b.item).trim(), per: Math.max(0, num(b.per, 1)), left: src ? Math.max(0, num(src.qty, 1)) : 0 };
    });
}

/** Resource pools an attack spends: [{ pool, per }] (Consumes blocks set to a pool, e.g. 2 FP per swing). */
export const poolCostsOf = (e) => itemBlocks(e).filter(b => b.type === 'consumes' && b.from === 'pool' && String(b.pool || '').trim())
    .map(b => ({ pool: String(b.pool).trim(), per: Math.max(0, num(b.per, 1)) }));

/** Pools a Consumes block can spend: the rules' resources, plus the health and stamina stats (by label). */
export function consumablePools() {
    const out = [...resourceNames()];
    for (const r of ['health', 'stamina']) { const k = role(r); if (k && !out.includes(statLabel(k))) out.push(statLabel(k)); }
    return out;
}

/**
 * Formulas in [brackets] inside a damage or level text, worked out from the character's values:
 * "1d8+[floor((Str-10)/2)]" with Str 14 → "1d8+2"; a negative result turns "+" into "-". Text without brackets is unchanged.
 */
export function expandFormulas(text, vars) {
    const s = String(text ?? '');
    if (!s.includes('[')) return s;
    const out = s.replace(/\[([^\]]*)\]/g, (m, f) => {
        const v = evalFormula(f, vars || {}, null);
        return v === null ? '0' : String(Math.floor(v));
    });
    return out.replace(/\+\s*-/g, '-').replace(/-\s*-/g, '+');
}

/** Charge pools of an item: [{ name, left, max }]. An empty left means unlimited (null). */
export function chargesOf(e) {
    return itemBlocks(e).filter(b => b.type === 'charges').map(b => ({
        name: String(b.name || '').trim() || 'Charges',
        left: String(b.left ?? '').trim() === '' ? null : Math.max(0, num(b.left)),
        max: String(b.max ?? '').trim() === '' ? null : Math.max(0, num(b.max)),
    }));
}

/** "charges:Charges" → the item's pool named so. */
export const chargePool = (e, resource) => {
    const m = /^charges:(.*)$/i.exec(String(resource || ''));
    if (!m) return null;
    return chargesOf(e).find(p => lc(p.name) === lc(m[1])) || null;
};

/** Spend one use of an item weapon (ammo) or item ability (charges) on the sheet itself. Returns true when anything changed. */
export function spendUse(sheet, i, block) {
    const e = sheet?.equipment?.[i];
    if (!e) return false;
    let changed = false;
    if (block?.type === 'attack') {
        for (const b of itemBlocks(e).filter(x => x.type === 'consumes')) {
            const src = findItem(sheet.equipment, b.item);
            if (!src) continue;
            src.qty = Math.max(0, num(src.qty, 1) - Math.max(0, num(b.per, 1)));
            changed = true;
        }
    }
    if (block?.type === 'ability' && Array.isArray(e.blocks)) {
        const m = /^charges:(.*)$/i.exec(String(block.resource || ''));
        const pool = m ? e.blocks.find(b => b.type === 'charges' && lc(b.name || 'Charges') === lc(m[1])) : null;
        if (pool && String(pool.left ?? '').trim() !== '') {
            pool.left = Math.max(0, num(pool.left) - Math.max(0, num(block.cost)));
            changed = true;
        }
    }
    return changed;
}

/** Label of a modifier target for menus and XML. */
export function modTargetLabel(t, statLabel = (k) => k) {
    const fixed = {
        'item:attack': "this item's attack", 'item:damage': "this item's damage", 'item:both': "this item's attack and damage",
        'item:armor': "this item's armor", 'item:block': "this item's block",
        attack: 'all attacks', damage: 'all damage', armor: 'armor (total)', dodge: 'dodge', parry: 'parry', block: 'block', armorClass: 'armor class',
    };
    if (fixed[t]) return fixed[t];
    const m = /^(attr|sec|skill):(.*)$/.exec(String(t || ''));
    if (m) return m[1] === 'skill' ? `skill ${m[2]}` : statLabel(m[2]);
    return String(t || '');
}

/** Item names a weapon might use as ammo (every other named item). */
export const ammoCandidates = (equipment, self) => (equipment || []).filter(x => x !== self && String(x.name || '').trim()).map(x => String(x.name).trim());
