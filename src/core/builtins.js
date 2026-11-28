// The built-in rules templates: read-only, from code, never stored. Settings keep only the active template's id.
import { GENERIC_RULES } from '../rules/generic.js';

export const BUILT_INS = [
    { id: 'builtin:generic', name: 'Generic (default)', rules: GENERIC_RULES },
    { id: 'builtin:none', name: 'None (no rules)', rules: {} },
];
