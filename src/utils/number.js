// Small pure number helpers (no DOM). Shared by the rules engine and the UI.

/** Coerce to a finite number, or return `def`. */
export const num = (v, def = 0) => (Number.isFinite(Number(v)) ? Number(v) : def);

/** Integers as-is, everything else rounded to 2 decimals. */
export const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

/** "+3" / "0" / "-2" */
export function signed(n) { return n > 0 ? `+${n}` : String(n); }
