// Effect macros written into trait, item or ability text, e.g. "Haste {{extra-turn}}", "{{extra-turn:2}}", "{{haste}}" or
// "{{immunity cold}}". The sheet only collects them; what each one does comes from the macro definitions in the rules
// (this sheet's rules `macros`, and Combat Mode's rules pack `macros`), and Combat Mode applies them.
import { normalizeSheet } from './sheet.js';
import { itemBlocks } from './items.js';

// {{name}} · {{name:arg}} · {{name=arg}} · {{name arg1 arg2}}
const MACRO_RX = /\{\{\s*([a-z][a-z0-9-]*)(?:\s*[:=]\s*([^}]*?)|\s+([^}]*?))?\s*\}\}/gi;

/** The arguments of a macro's text: split on commas when it has any, else on spaces. */
export function macroArgList(arg) {
    const s = String(arg ?? '').trim();
    if (!s) return [];
    return (s.includes(',') ? s.split(',') : s.split(/\s+/)).map(x => x.trim()).filter(Boolean);
}

/** Macros in a piece of text: [{ name, arg, args }] (name lower-case, arg the text after the name ('' when none), args split). */
export function macrosIn(text) {
    const out = [];
    for (const m of String(text ?? '').matchAll(MACRO_RX)) {
        const arg = String(m[2] ?? m[3] ?? '').trim();
        out.push({ name: m[1].toLowerCase(), arg, args: macroArgList(arg) });
    }
    return out;
}

/**
 * A row's `effects` field: the rule-defined effects it has (macro definitions of the rules, by name), written
 * "name arg1 arg2" or "name: one argument", one per line or separated by ";". [{ name, arg, args }]
 */
export function effectsIn(v) {
    const list = Array.isArray(v) ? v : String(v ?? '').split(/[;\n]+/);
    const out = [];
    for (const raw of list) {
        const t = String(raw ?? '').trim().replace(/^\{\{|\}\}$/g, '').trim();
        const m = /^([a-z][a-z0-9-]*)(?:\s*[:=]\s*(.*)|\s+(.*))?$/i.exec(t);
        if (!m) continue;
        const arg = String(m[2] ?? m[3] ?? '').trim();
        // "name: text" keeps the text as one argument (spaces and all); "name a b" splits it
        out.push({ name: m[1].toLowerCase(), arg, args: m[2] !== undefined ? (arg ? [arg] : []) : macroArgList(arg) });
    }
    return out;
}

/** What a row does by rule: its `effects` field and the {{macros}} in its notes. Never its name. */
const rowMacros = (row) => [...effectsIn(row?.effects), ...macrosIn(row?.effect)];

/**
 * Every macro on a sheet, with where it came from: `from` = the trait, item, ability or attack it is on, `row` = what
 * kind of row that is ('trait' | 'item' | 'ability' | 'attack'). Only a row's `effects` field and the {{macros}} in its
 * notes count: a name never does anything ("Sword of Attack" is just a name).
 */
export function sheetMacros(sheet) {
    const sh = normalizeSheet(sheet);
    const out = [];
    for (const t of sh.traits) for (const m of rowMacros(t)) out.push({ ...m, from: String(t.name || ''), row: 'trait' });
    for (const e of sh.equipment) {
        const item = String(e.name || '').trim();
        for (const m of rowMacros(e)) out.push({ ...m, from: item, row: 'item' });
        const blocks = itemBlocks(e);
        const attacks = blocks.filter(x => x.type === 'attack');
        attacks.forEach((b, k) => {
            // an attack block's own effects: only that attack (named as the sheet sends it, see combat.js)
            const label = String(b.label || '').trim();
            const name = attacks.length > 1 ? `${item} ${label || `Attack ${k + 1}`}` : label ? `${item} ${label}` : `${item} Attack`;
            for (const m of rowMacros(b)) out.push({ ...m, from: name, row: 'attack' });
        });
        // an ability stored on an item: its macros apply to that ability ("Fireball (Oak Wand)")
        for (const b of blocks.filter(x => x.type === 'ability' && String(x.name || '').trim())) {
            for (const m of rowMacros(b)) out.push({ ...m, from: `${String(b.name).trim()} (${item})`, row: 'ability' });
        }
    }
    // abilities: their macros are attack fields of that ability (Combat Mode): never on the character as a whole
    for (const a of sh.abilities || []) for (const m of rowMacros(a)) out.push({ ...m, from: String(a.name || ''), row: 'ability' });
    return out;
}
