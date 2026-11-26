// The active rules config. It ships EMPTY: every table and formula is typed in by the user
// from their own rulebook (Extensions → NPC Book - Character Sheet → Rules). The engine only does generic math.
import { num } from '../utils/number.js';


/** Engine fallback for the attribute a blank sheet starts at, when the rules don't set one. */
export const FALLBACK_ATTR = 10;

export const EMPTY_RULES = Object.freeze({
    name: '',
    attributes: [],          // [{ key, label }]: the main stats, all named by the user
    attrBase: null,          // value a blank sheet starts at
    secondary: [],           // [{ key, label, base: "formula", step, roll: "roll name" }]
    basicLift: '',           // formula (vars: attributes and secondary keys)
    liftUnit: '',            // shown after the lift / carried weight, e.g. "lb" or "kg"
    damageTable: [],         // [{ at, thrust: "NdM", swing: "NdM" }] (row with the highest at ≤ the roles.damage attribute)
    encumbrance: [],         // [{ name, load (× lift), move (× Move), dodge (modifier) }]
    dodge: '',               // formula (vars: attributes, secondary keys, lift)
    parry: '',               // formula (var: skill)
    block: '',               // formula (var: skill)
    armorClass: '',          // formula for a fixed defense number that attacks must reach (vars: attributes, secondary keys, lift, armor)
    unskilled: '',           // formula for an untrained attack (vars: attributes, secondary keys)
    unarmedLevel: '',        // formula for unarmed attacks when no unarmed skill is on the sheet ('' = the roles.defaultAttr attribute)
    armorCategories: [],     // equipment categories whose "armor N" counts toward armor, e.g. ["armor", "shield"] ([] = "armor" only)
    resources: [],           // [{ name, max: "formula" }]: what abilities spend (FP, mana, spell slots…). [] = the roles.stamina value
    hpRoll: { per: '', dice: '', first: '' }, // HP gained by dice: one roll of `dice` per point of `per` (a key such as a level);
                             // first: 'max' = the first roll is the most the dice can show. The sum is the formula variable HPRolls
    defenseTraits: [],       // [{ name, bonus }]: a trait with this name adds bonus to all defenses
    gearBonuses: [],         // [{ word, categories, adds }]: an item whose stat text has "<word> N" adds N to `adds`
                             // (dodge / parry / block / armorClass); categories limits which items count ([] = any)
    skillCosts: [],          // [{ pts, level }]: points spent → level above the skill's attribute ([] = levels are typed in)
    skillCostEach: null,     // { pts, level }: past the last row, every `pts` more points add `level`
    skillDifficulties: [],   // [{ name, base }]: a skill's difficulty adds `base` to the level from points
    categorySkills: [],      // [{ category, skill }]: an item of that category without a skill field uses that skill
    unarmedSkills: [],       // [{ name, bonus: [{ over, perDie }] }]: over = skill − the roles.defaultAttr attribute
    unarmedAttacks: [],      // [{ name, levelMod, damage: "thr-1 type" }]
    woundMultipliers: {},    // { damageType: multiplier }
    defaultDamageType: '',
    sheetXml: { stats: [], level: '', cost: '' }, // what the LLM gets: stat lines [[{ tag, of }]], tag names (cost = an ability's use cost)
    roles: {},               // which of your keys does what: { damage, defaultAttr, health, stamina, speed, move }
    itemPresets: [],         // [{ name, category, qty, blocks: [{ type, …block fields }] }]: the "New item" buttons of this rule set
                             // (e.g. a melee weapon with swing + thrust attacks); damage / level fields may use formulas in [brackets]
    macros: [],              // home-brew macros: what {{name args}} in trait / item text does. [{ name, aliases, params, defaults, text,
                             // actions, actionsTimes, immune, damageTaken, mods }]. Sent with each character; Combat Mode applies them
});

/** Structure-only starter: the common keys with no numbers or formulas. The user fills in the values. */
export const BLANK_TEMPLATE = {
    name: 'My table',
    attributes: [{ key: '', label: '' }],
    attrBase: null,
    secondary: [{ key: '', label: '', base: '', step: 1, roll: '' }],
    basicLift: '', liftUnit: '',
    damageTable: [{ at: null, thrust: '', swing: '' }],
    encumbrance: [{ name: '', load: null, move: null, dodge: null }],
    dodge: '', parry: '', block: '', armorClass: '', unskilled: '', unarmedLevel: '', armorCategories: [], resources: [],
    hpRoll: { per: '', dice: '', first: '' },
    defenseTraits: [], gearBonuses: [], unarmedSkills: [], unarmedAttacks: [],
    skillCosts: [], skillCostEach: null, skillDifficulties: [], categorySkills: [],
    woundMultipliers: {}, defaultDamageType: '',
    sheetXml: { stats: [[{ tag: '', of: '' }]], level: '', cost: '' },
    roles: { damage: '', defaultAttr: '', health: '', stamina: '', speed: '', move: '' },
    itemPresets: [{ name: '', category: '', blocks: [{ type: 'attack', use: 'melee', damage: '' }] }],
    macros: [{ name: '', params: [], text: '' }],
};

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** What a gear bonus can add to. */
export const GEAR_TARGETS = ['dodge', 'parry', 'block', 'armorClass'];
const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => String(v ?? '').trim();
const tagOr = (v) => (KEY_RE.test(str(v)) ? str(v) : '');
const ROLE_KEYS = ['damage', 'defaultAttr', 'health', 'stamina', 'speed', 'move'];
const MACRO_NAME_RE = /^[a-z][a-z0-9-]*$/;
/** Home-brew macro definitions: kept as written (Combat Mode reads the effect fields); entries without a valid name are dropped. */
const macroDefs = (v) => arr(v).filter(x => x && typeof x === 'object' && !Array.isArray(x) && MACRO_NAME_RE.test(str(x.name).toLowerCase()))
    .map(x => ({ ...JSON.parse(JSON.stringify(x)), name: str(x.name).toLowerCase() }));
/** Block types an item preset may hold (see engine/items.js). */
const PRESET_BLOCKS = ['attack', 'defense', 'modifier', 'ability', 'charges', 'consumes'];
const plainObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
/** Item presets: kept as written (block fields are the sheet's own); entries without a name and unknown block types are dropped. */
const itemPresets = (v) => arr(v).filter(x => plainObj(x) && str(x.name)).map(x => ({
    name: str(x.name), category: str(x.category), ...(nOrNull(x.qty) !== null ? { qty: Number(x.qty) } : {}),
    ...(str(x.effect) ? { effect: str(x.effect) } : {}),
    blocks: arr(x.blocks).filter(b => plainObj(b) && PRESET_BLOCKS.includes(str(b.type))).map(b => ({ ...JSON.parse(JSON.stringify(b)), type: str(b.type) })),
}));
const nOrNull = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Validate and fill a rules object (from settings or an imported file). Unknown keys are dropped. */
export function normalizeRules(r) {
    const o = r && typeof r === 'object' ? r : {};
    const seen = new Set();
    const attributes = arr(o.attributes).filter(x => KEY_RE.test(str(x?.key)) && !seen.has(str(x.key)) && seen.add(str(x.key)))
        .map(x => ({ key: str(x.key), label: str(x.label) || str(x.key) }));
    const ATTRS = attributes.map(x => x.key);
    const roles = {};
    for (const k of ROLE_KEYS) roles[k] = tagOr(o.roles?.[k]);
    const wound = {};
    for (const [k, v] of Object.entries(o.woundMultipliers || {})) { const m = nOrNull(v); if (str(k) && m !== null) wound[str(k).toLowerCase()] = m; }
    return {
        name: str(o.name),
        attributes,
        attrBase: nOrNull(o.attrBase),
        secondary: arr(o.secondary).filter(x => KEY_RE.test(str(x?.key)) && !ATTRS.includes(str(x.key)))
            .map(x => ({ key: str(x.key), label: str(x.label) || str(x.key), base: str(x.base), step: num(x.step, 1) || 1, roll: str(x.roll) })),
        basicLift: str(o.basicLift),
        liftUnit: str(o.liftUnit),
        damageTable: arr(o.damageTable).filter(x => nOrNull(x?.at ?? x?.st) !== null && (str(x.thrust) || str(x.swing)))
            .map(x => ({ at: Number(x.at ?? x.st), thrust: str(x.thrust), swing: str(x.swing) })).sort((a, b) => a.at - b.at),
        encumbrance: arr(o.encumbrance).filter(x => str(x?.name) && nOrNull(x.load) !== null)
            .map(x => ({ name: str(x.name), load: Number(x.load), move: num(x.move, 1), dodge: num(x.dodge) })).sort((a, b) => a.load - b.load),
        dodge: str(o.dodge),
        parry: str(o.parry),
        block: str(o.block),
        armorClass: str(o.armorClass),
        unskilled: str(o.unskilled),
        unarmedLevel: str(o.unarmedLevel),
        armorCategories: arr(o.armorCategories).map(x => str(x).toLowerCase()).filter(Boolean),
        resources: arr(o.resources).filter(x => str(x?.name)).map(x => ({ name: str(x.name), max: str(x.max) })),
        hpRoll: { per: tagOr(o.hpRoll?.per), dice: str(o.hpRoll?.dice), first: str(o.hpRoll?.first) === 'max' ? 'max' : '' },
        defenseTraits: arr(o.defenseTraits).filter(x => str(x?.name)).map(x => ({ name: str(x.name), bonus: num(x.bonus) })),
        gearBonuses: arr(o.gearBonuses).filter(x => /^[A-Za-z][A-Za-z0-9_-]*$/.test(str(x?.word)))
            .map(x => ({ word: str(x.word), categories: arr(x.categories).map(c => str(c).toLowerCase()).filter(Boolean), adds: arr(x.adds).map(a => str(a)).filter(a => GEAR_TARGETS.includes(a)) }))
            .filter(x => x.adds.length),
        skillCosts: arr(o.skillCosts).filter(x => nOrNull(x?.pts) !== null && nOrNull(x?.level) !== null)
            .map(x => ({ pts: Number(x.pts), level: Number(x.level) })).sort((a, b) => a.pts - b.pts),
        skillCostEach: nOrNull(o.skillCostEach?.pts) > 0 && nOrNull(o.skillCostEach?.level) !== null ? { pts: Number(o.skillCostEach.pts), level: Number(o.skillCostEach.level) } : null,
        skillDifficulties: arr(o.skillDifficulties).filter(x => str(x?.name)).map(x => ({ name: str(x.name), base: num(x.base) })),
        categorySkills: arr(o.categorySkills).filter(x => str(x?.category) && str(x?.skill)).map(x => ({ category: str(x.category).toLowerCase(), skill: str(x.skill) })),
        unarmedSkills: arr(o.unarmedSkills).filter(x => str(x?.name))
            .map(x => ({ name: str(x.name), bonus: arr(x.bonus).map(b => ({ over: num(b?.over), perDie: num(b?.perDie) })).sort((a, b) => b.over - a.over) })),
        unarmedAttacks: arr(o.unarmedAttacks).filter(x => str(x?.name)).map(x => ({ name: str(x.name), levelMod: num(x.levelMod), damage: str(x.damage) })),
        woundMultipliers: wound,
        defaultDamageType: str(o.defaultDamageType).toLowerCase(),
        sheetXml: {
            stats: arr(o.sheetXml?.stats).map(line => arr(line).filter(e => KEY_RE.test(str(e?.tag)) && str(e.of)).map(e => ({ tag: str(e.tag), of: str(e.of) }))).filter(l => l.length),
            level: tagOr(o.sheetXml?.level),
            cost: tagOr(o.sheetXml?.cost),
        },
        roles,
        itemPresets: itemPresets(o.itemPresets),
        macros: macroDefs(o.macros),
    };
}

let active = normalizeRules(EMPTY_RULES);

/** Set the rules the engine uses (called by the extension from settings, or by tests). */
export function setRules(r) { active = normalizeRules(r); return active; }

/** The rules the engine uses now (normalized). */
export const rules = () => active;

/** True when the user has filled in anything at all. */
export function rulesConfigured(r = active) {
    return r.attributes.length > 0 || r.attrBase !== null || r.secondary.length > 0 || !!r.basicLift
        || r.damageTable.length > 0 || r.encumbrance.length > 0 || !!r.dodge || !!r.armorClass || r.sheetXml.stats.length > 0;
}

export const attrBase = () => active.attrBase ?? FALLBACK_ATTR;
export const secondaryList = () => active.secondary;
/** The user's attribute keys, in their order. */
export const attrKeys = () => active.attributes.map(x => x.key);
/** Label of an attribute or secondary key. */
export const statLabel = (k) => active.attributes.find(x => x.key === k)?.label ?? active.secondary.find(x => x.key === k)?.label ?? k;
/** The key the rules give a role (damage, defaultAttr, health, stamina, speed, move), or ''. */
export const role = (k) => active.roles[k] || '';
/** Attribute used when a skill names none: roles.defaultAttr, else the first attribute. */
export const defaultAttr = () => role('defaultAttr') || attrKeys()[0] || '';
/** Attributes a skill can be based on: the four attributes plus every secondary key. */
export const skillAttrs = () => [...attrKeys(), ...active.secondary.map(x => x.key)];
export const woundMult = (type) => active.woundMultipliers[String(type || '').toLowerCase()] ?? 1;

/** Skill levels come from points spent (the rules have a skillCosts table). */
export const skillsUsePoints = () => active.skillCosts.length > 0;

/** The level modifier of a skill difficulty (0 for none / an unknown one). */
export const diffBase = (name) => active.skillDifficulties.find(d => d.name.toLowerCase() === String(name ?? '').trim().toLowerCase())?.base ?? 0;
