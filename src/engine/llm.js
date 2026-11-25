// Build a sheet from the "sheet" object the LLM writes for new NPCs.
// The LLM is asked for numbers and free-text names only (no point costs, no book data).
import { ABILITY_USES, ABILITY_FX, ABILITY_AIMS, ABILITY_STATS, resistAttrs } from './rules.js';
import { attrKeys, defaultAttr, skillAttrs, difficulties, diffBase, skillsUsePoints } from '../rules/ruleset.js';
import { defaultSheet } from './sheet.js';
import { compute } from './compute.js';
import { pointsForRelative } from './skills.js';
import { num } from '../utils/number.js';

function addSkills(sh, g) {
    const attrVal = compute(sh).attrVal;
    const attrs = skillAttrs();
    const diffs = difficulties();
    const skills = Array.isArray(g.skills) ? g.skills : Object.entries(g.skills || {}).map(([n, lvl]) => [n, null, lvl]);
    for (const row of skills) {
        // [name, attr, level], or [name, level] without attributes; the older shape [name, attr, diff, level] is still read
        const r = Array.isArray(row) ? (row.length >= 4 ? row : row.length === 2 ? [row[0], null, null, row[1]] : [row[0], row[1], null, row[2]]) : [row?.name, row?.attr, row?.diff, row?.level ?? row?.SL];
        const [name, attr0, diff0, lvl] = r;
        if (!name) continue;
        const attr = attrs.includes(String(attr0)) ? String(attr0) : defaultAttr();
        const diff = diffs.includes(String(diff0)) ? String(diff0) : (diffs[0] ?? '');
        const level = Number(lvl);
        const base = diffBase(diff);
        const rel = Number.isFinite(level) ? level - (attr ? num(attrVal[attr]) : 0) : base;
        sh.skills.push({ name: String(name), attr, diff, pts: pointsForRelative(diff, skillsUsePoints() ? Math.max(rel, base) : rel) });
    }
}

function addTraits(sh, g) {
    const traits = Array.isArray(g.traits) ? g.traits : Object.entries(g.traits || {});
    for (const row of traits) {
        let name; let pts = 0; let effect = '';
        if (typeof row === 'string') name = row;
        else if (Array.isArray(row)) {
            name = row[0];
            // [name, effect] (current prompt) or [name, pts, effect] (older sheets)
            if (typeof row[1] === 'number') { pts = row[1]; effect = row[2] ?? ''; } else effect = row[1] ?? '';
        } else { name = row?.name; pts = num(row?.pts); effect = row?.effect ?? ''; }
        if (name) sh.traits.push({ name: String(name), pts: num(pts), effect: effect ? String(effect) : '' });
    }
}

const digits = (v) => num(String(v ?? '').replace(/[^\d.]/g, ''));

function addEquipment(sh, g) {
    for (const it of Array.isArray(g.equipment) ? g.equipment : []) {
        if (typeof it === 'string') sh.equipment.push({ name: it, qty: 1, weight: 0, value: 0, category: '', stat: '', effect: '' });
        else if (it?.name) {
            const armor = digits(it.armor);
            const stat = String(it.stat ?? it.damage ?? '') || (armor ? `DR ${armor}` : '');
            sh.equipment.push({
                name: String(it.name), qty: num(it.qty, 1) || 1, weight: digits(it.weight), value: digits(it.value),
                category: String(it.category ?? ''), stat, skill: String(it.skill ?? ''), effect: String(it.effect ?? ''),
            });
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
            range: digits(row.range ?? row.reach), cost: digits(row.fp ?? row.cost), pts: num(row.pts), effect: String(row.effect ?? ''),
        });
    }
}

/**
 * entry.sheet (older chats: entry.gurps) = { [attribute key]: value…, skills: [[name, attr, level], ...] | {name: level},
 *     traits: [[name, effect], ...] | [name], equipment: [name | {name, category, damage, armor, weight, value}],
 *     abilities: [{name, kind, use, fx, on, skill, damage, stat, mod, turns, resist, range, fp, effect}] }
 */
export function sheetFromLLM(g, budget = 100) {
    const sh = defaultSheet();
    sh.budget = budget;
    sh.enabled = true; // the LLM made it on request
    if (!g || typeof g !== 'object') return sh;
    for (const k of attrKeys()) if (Number.isFinite(Number(g[k]))) sh.attrs[k] = Math.max(1, Math.min(99, Math.round(Number(g[k]))));
    addSkills(sh, g);
    addTraits(sh, g);
    addEquipment(sh, g);
    addAbilities(sh, g);
    return sh;
}
