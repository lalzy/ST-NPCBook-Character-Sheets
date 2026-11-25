// The active rules config. It ships EMPTY: every table and formula is typed in by the user
// from their own rulebook (Extensions → NPC Book Character Sheet → Rules). The engine only does generic math.
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
    defenseTraits: [],       // [{ name, bonus }]: a trait with this name adds bonus to all defenses
    unarmedSkills: [],       // [{ name, bonus: [{ over, perDie }] }]: over = skill − the roles.defaultAttr attribute
    unarmedAttacks: [],      // [{ name, levelMod, damage: "thr-1 type" }]
    woundMultipliers: {},    // { damageType: multiplier }
    defaultDamageType: '',
    sheetXml: { stats: [], level: '', cost: '' }, // what the LLM gets: stat lines [[{ tag, of }]], tag names (cost = an ability's use cost)
    roles: {},               // which of your keys does what: { damage, defaultAttr, health, stamina, speed, move }
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
    dodge: '', parry: '', block: '', armorClass: '', unskilled: '',
    defenseTraits: [], unarmedSkills: [], unarmedAttacks: [],
    woundMultipliers: {}, defaultDamageType: '',
    sheetXml: { stats: [[{ tag: '', of: '' }]], level: '', cost: '' },
    roles: { damage: '', defaultAttr: '', health: '', stamina: '', speed: '', move: '' },
};

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => String(v ?? '').trim();
const tagOr = (v) => (KEY_RE.test(str(v)) ? str(v) : '');
const ROLE_KEYS = ['damage', 'defaultAttr', 'health', 'stamina', 'speed', 'move'];
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
        defenseTraits: arr(o.defenseTraits).filter(x => str(x?.name)).map(x => ({ name: str(x.name), bonus: num(x.bonus) })),
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
