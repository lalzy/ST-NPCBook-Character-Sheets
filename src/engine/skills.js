// Skill level ↔ points, from the rules' cost table (skillCosts, skillCostEach) and difficulties (skillDifficulties).
// Levels are relative: attribute + difficulty base + the table's level. Without a table, levels are typed in.
import { rules, diffBase, skillsUsePoints } from '../rules/ruleset.js';
import { num } from '../utils/number.js';

/** Relative skill level for points spent (or the typed relative level without a cost table). null = no level. */
export function relativeLevel(diff, pts) {
    const b = diffBase(diff);
    if (!skillsUsePoints()) return b + Math.round(num(pts));
    const p = num(pts);
    const table = rules().skillCosts;
    if (p <= 0 || p < table[0].pts) return null;
    let i = 0;
    while (i + 1 < table.length && table[i + 1].pts <= p) i++;
    let level = table[i].level;
    const each = rules().skillCostEach;
    if (i === table.length - 1 && each) level += Math.floor((p - table[i].pts) / each.pts) * each.level;
    return b + level;
}

/** Minimum points needed to reach a relative level (or the relative level itself without a cost table). */
export function pointsForRelative(diff, rel) {
    const b = diffBase(diff);
    if (!skillsUsePoints()) return Math.round(rel - b);
    const want = rel - b;
    const table = rules().skillCosts;
    const row = table.find(r => r.level >= want);
    if (row) return row.pts;
    const last = table[table.length - 1];
    const each = rules().skillCostEach;
    if (!each || each.level <= 0) return last.pts;
    return last.pts + Math.ceil((want - last.level) / each.level) * each.pts;
}
