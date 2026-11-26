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

/** Every macro on a sheet's traits and equipment, with where it came from. */
export function sheetMacros(sheet) {
    const sh = normalizeSheet(sheet);
    const out = [];
    for (const t of sh.traits) for (const m of macrosIn(`${t.name || ''} ${t.effect || ''}`)) out.push({ ...m, from: String(t.name || '') });
    for (const e of sh.equipment) {
        for (const m of macrosIn(`${e.name || ''} ${e.stat || ''} ${e.effect || ''}`)) out.push({ ...m, from: String(e.name || '') });
        // an ability stored on an item: its macros apply to that ability ("Fireball (Oak Wand)")
        for (const b of itemBlocks(e).filter(x => x.type === 'ability' && String(x.name || '').trim())) {
            for (const m of macrosIn(`${b.name || ''} ${b.kind || ''} ${b.effect || ''}`)) out.push({ ...m, from: `${String(b.name).trim()} (${String(e.name || '').trim()})` });
        }
    }
    // abilities too ("Fireball {{missile}}", effect text "{{explosive 3}}"): Combat Mode applies attack fields to that ability
    for (const a of sh.abilities || []) for (const m of macrosIn(`${a.name || ''} ${a.kind || ''} ${a.effect || ''}`)) out.push({ ...m, from: String(a.name || '') });
    return out;
}
