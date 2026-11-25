// Build a sheet from the "gurps" object the LLM writes for new NPCs.
import { ATTRS, SKILL_ATTRS, DIFFICULTIES, DIFF_BASE, ABILITY_USES, ABILITY_FX, ABILITY_AIMS, ABILITY_STATS, RESIST_ATTRS } from './rules.js';
import { defaultSheet } from './sheet.js';
import { compute } from './compute.js';
import { pointsForRelative } from './skills.js';
import { num } from '../utils/number.js';

function addSkills(sh, g) {
    const c0 = compute(sh);
    const attrVal = { ...c0.attrs, Will: c0.values.Will, Per: c0.values.Per };
    const skills = Array.isArray(g.skills) ? g.skills : Object.entries(g.skills || {}).map(([n, lvl]) => [n, null, null, lvl]);
    for (const row of skills) {
        const [name, attr0, diff0, lvl] = Array.isArray(row) ? row : [row?.name, row?.attr, row?.diff, row?.level ?? row?.SL];
        if (!name) continue;
        const attr = SKILL_ATTRS.includes(String(attr0)) ? String(attr0) : 'DX';
        const diff = DIFFICULTIES.includes(String(diff0)) ? String(diff0) : 'A';
        const level = Number(lvl);
        const rel = Number.isFinite(level) ? level - attrVal[attr] : DIFF_BASE[diff];
        sh.skills.push({ name: String(name), attr, diff, pts: pointsForRelative(diff, Math.max(rel, DIFF_BASE[diff])) });
    }
}

function addTraits(sh, g) {
    const traits = Array.isArray(g.traits) ? g.traits : Object.entries(g.traits || {});
    for (const row of traits) {
        const [name, pts, effect] = Array.isArray(row) ? row : (typeof row === 'string' ? [row, 0] : [row?.name, row?.pts, row?.effect]);
        if (name) sh.traits.push({ name: String(name), pts: num(pts), effect: effect ? String(effect) : '' });
    }
}

const digits = (v) => num(String(v ?? '').replace(/[^\d.]/g, ''));

function addEquipment(sh, g) {
    for (const it of Array.isArray(g.equipment) ? g.equipment : []) {
        if (typeof it === 'string') sh.equipment.push({ name: it, qty: 1, weight: 0, value: 0, category: '', stat: '', effect: '' });
        else if (it?.name) {
            sh.equipment.push({
                name: String(it.name), qty: num(it.qty, 1) || 1, weight: digits(it.weight), value: digits(it.value),
                category: String(it.category ?? ''), stat: String(it.stat ?? ''), skill: String(it.skill ?? ''), effect: String(it.effect ?? ''),
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
        const resist = RESIST_ATTRS.find(r => r && r.toLowerCase() === String(row.resist ?? '').toLowerCase()) || '';
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
 * entry.gurps = { ST, DX, IQ, HT, skills: [[name, attr, diff, level], ...] | {name: level},
 *                 traits: [[name, pts], ...] | {name: pts} | [name], equipment: [name | {name, ...}],
 *                 abilities: [{name, kind, use, fx, on, skill, damage, stat, mod, turns, resist, range, fp, effect}] }
 */
export function sheetFromLLM(g, budget = 100) {
    const sh = defaultSheet();
    sh.budget = budget;
    sh.enabled = true; // the LLM made it for a GURPS game
    if (!g || typeof g !== 'object') return sh;
    for (const k of ATTRS) if (Number.isFinite(Number(g[k]))) sh.attrs[k] = Math.max(1, Math.min(30, Math.round(Number(g[k]))));
    addSkills(sh, g);
    addTraits(sh, g);
    addEquipment(sh, g);
    addAbilities(sh, g);
    return sh;
}
