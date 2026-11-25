// Skill cost table (Basic Set).
import { DIFF_BASE } from './rules.js';
import { num } from '../utils/number.js';

/** Relative skill level for points spent. null = no points (default only). */
export function relativeLevel(diff, pts) {
    const p = Math.max(0, Math.floor(num(pts)));
    if (p <= 0) return null;
    const b = DIFF_BASE[diff] ?? -1;
    if (p < 2) return b;
    if (p < 4) return b + 1;
    return b + 2 + Math.floor((p - 4) / 4);
}

/** Minimum points needed to reach a relative level. */
export function pointsForRelative(diff, rel) {
    const b = DIFF_BASE[diff] ?? -1;
    const steps = rel - b;
    if (steps <= 0) return 1;
    if (steps === 1) return 2;
    return 4 + (steps - 2) * 4;
}
