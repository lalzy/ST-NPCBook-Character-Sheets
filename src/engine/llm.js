// Build a sheet from the "sheet" object the LLM writes for new NPCs.
// The LLM is asked for numbers and free-text names only (no book data).
import { ABILITY_USES, ABILITY_FX, ABILITY_AIMS, ABILITY_STATS, resistAttrs } from './rules.js';
import { attrKeys, defaultAttr, skillAttrs } from '../rules/ruleset.js';
import { defaultSheet } from './sheet.js';
import { setHeld } from './held.js';
import { itemFromText } from './items.js';
import { num } from '../utils/number.js';

function addSkills(sh, g) {
    const attrs = skillAttrs();
    const skills = Array.isArray(g.skills) ? g.skills : Object.entries(g.skills || {}).map(([n, lvl]) => [n, null, lvl]);
    for (const row of skills) {
        // [name, attr, level] or [name, level]; with 4 items the level is the last one
        const r = Array.isArray(row) ? (row.length === 2 ? [row[0], null, row[1]] : [row[0], row[1], row[row.length - 1]]) : [row?.name, row?.attr, row?.level];
        const [name, attr0, lvl] = r;
        if (!name) continue;
        const attr = attrs.includes(String(attr0)) ? String(attr0) : defaultAttr();
        const level = Number(lvl);
        sh.skills.push({ name: String(name), attr, level: Number.isFinite(level) ? level : '' });
    }
}

function addTraits(sh, g) {
    const traits = Array.isArray(g.traits) ? g.traits : Object.entries(g.traits || {});
    for (const row of traits) {
        let name; let effect = ''; let effects = '';
        if (typeof row === 'string') name = row;
        else if (Array.isArray(row)) { name = row[0]; effect = row.slice(1).find(x => typeof x === 'string') ?? ''; }
        else { name = row?.name; effect = row?.effect ?? row?.notes ?? ''; effects = effectsText(row?.effects); }
        if (name) sh.traits.push({ name: String(name), effect: effect ? String(effect) : '', ...(effects ? { effects } : {}) });
    }
}

/** An `effects` value (a list or text) as the sheet stores it: "name args; name args". */
const effectsText = (v) => (Array.isArray(v) ? v.map(x => String(x ?? '').trim()).filter(Boolean).join('; ') : String(v ?? '').trim());

const digits = (v) => num(String(v ?? '').replace(/[^\d.]/g, ''));

function addEquipment(sh, g) {
    for (const it of Array.isArray(g.equipment) ? g.equipment : []) {
        if (typeof it === 'string') sh.equipment.push({ name: it, qty: 1, weight: 0, value: 0, category: '', effect: '', blocks: [] });
        else if (it?.name) {
            const armor = digits(it.armor);
            const stat = String(it.stat ?? it.damage ?? '') || (armor ? `DR ${armor}` : '');
            sh.equipment.push(itemFromText({
                name: String(it.name), qty: num(it.qty, 1) || 1, weight: digits(it.weight), value: digits(it.value),
                category: String(it.category ?? ''), stat, skill: String(it.skill ?? ''), effect: String(it.effect ?? ''),
                ...([1, 2].includes(Number(it.hands)) ? { hands: Number(it.hands) } : {}),
            }));
            const fx = effectsText(it.effects);
            if (fx) sh.equipment[sh.equipment.length - 1].effects = fx;
            // "held": "primary" / "off" (or true = the primary hand): what it has in hand when we meet it
            const h = String(it.held ?? '').trim().toLowerCase();
            if (h === 'primary' || h === 'true' || h === 'main' || h === 'yes') sh.held.primary = sh.held.primary || String(it.name);
            else if (h === 'off' || h === 'offhand' || h === 'off-hand') sh.held.off = sh.held.off || String(it.name);
        }
    }
}

function addAbilities(sh, g) {
    for (const it of Array.isArray(g.abilities) ? g.abilities : []) {
        const row = Array.isArray(it) ? { name: it[0], kind: it[1], use: it[2], damage: it[3], range: it[4], fp: it[5] } : (typeof it === 'string' ? { name: it } : it);
        if (!row?.name) continue;
        const use = String(row.use ?? row.type ?? '').toLowerCase();
        const fxRaw = String(row.fx ?? row.does ?? '').toLowerCase();
        const fx = ABILITY_FX.includes(fxRaw) ? fxRaw : (row.damage ? 'damage' : 'none');
        const aim = String(row.on ?? row.aim ?? row.target ?? '').toLowerCase();
        const stat = String(row.stat ?? '').toLowerCase();
        const resist = resistAttrs().find(r => r && r.toLowerCase() === String(row.resist ?? '').toLowerCase()) || '';
        sh.abilities.push({
            name: String(row.name), kind: String(row.kind ?? ''),
            use: ABILITY_USES.includes(use) ? use : (fx === 'damage' || fx === 'stun' || fx === 'disarm' ? 'ranged' : 'utility'),
            fx, aim: ABILITY_AIMS.includes(aim) ? aim : '',
            skill: String(row.skill ?? ''), damage: String(row.damage ?? row.amount ?? ''),
            stat: ABILITY_STATS.includes(stat) ? stat : '', mod: num(row.mod), duration: digits(row.turns ?? row.duration), resist,
            range: digits(row.range ?? row.reach), cost: digits(row.fp ?? row.cost), effect: String(row.effect ?? row.notes ?? ''), effects: effectsText(row.effects),
            dc: row.dc === undefined || row.dc === null ? '' : String(row.dc), save: String(row.save ?? '').toLowerCase() === 'half' ? 'half' : 'none',
            resource: String(row.resource ?? ''), defendWith: String(row.defendWith ?? row.defended_by ?? ''),
            castTime: digits(row.castTime ?? row.cast_time), hits: /^(auto|yes|true|always)/i.test(String(row.hits ?? row.always_hits ?? '')) ? 'auto' : 'roll',
        });
    }
}

/**
 * entry.sheet = { [attribute key]: value…, skills: [[name, attr, level], ...] | {name: level},
 *     traits: [[name, effect], ...] | [name], equipment: [name | {name, category, damage, armor, weight, value}],
 *     abilities: [{name, kind, use, fx, on, skill, damage, stat, mod, turns, resist, dc, save, resource, range, fp, effect}] }
 */
export function sheetFromLLM(g) {
    const sh = defaultSheet();
    sh.enabled = true; // the LLM made it on request
    if (!g || typeof g !== 'object') return sh;
    for (const k of attrKeys()) if (Number.isFinite(Number(g[k]))) sh.attrs[k] = Math.max(1, Math.min(99, Math.round(Number(g[k]))));
    addSkills(sh, g);
    addTraits(sh, g);
    addEquipment(sh, g);
    addAbilities(sh, g);
    setHeld(sh, sh.held); // drops a held item the sheet doesn't carry, or an off-hand next to a two-handed one
    return sh;
}
