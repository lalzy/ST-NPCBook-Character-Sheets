// Values from the user's rules config from the user's rules config: lift and thrust/swing dice.
import { rules } from '../rules/ruleset.js';
import { evalFormula } from '../rules/formula.js';

/** Lift from the user's formula; null when not configured. */
export function basicLift(vars) {
    return evalFormula(rules().basicLift, vars, null);
}

/** Thrust / swing dice from the user's table: the row with the highest `at` at or below the value. */
export function damage(value) {
    const table = rules().damageTable;
    if (!table.length || value === null || value === undefined) return { thrust: null, swing: null };
    let row = table[0];
    for (const r of table) if (r.at <= value) row = r;
    return { thrust: row.thrust || null, swing: row.swing || null };
}
