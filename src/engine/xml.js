// Serialize a sheet into the XML block sent to the LLM.
import { normalizeSheet } from './sheet.js';
import { compute } from './compute.js';
import { num, fmt, signed } from '../utils/number.js';
import { attrKeys, rules, secondaryList } from '../rules/ruleset.js';

/** Tag names from the rules config (sheetXml), with plain defaults. */
const tags = () => { const x = rules().sheetXml; return { level: x.level || 'level', relative: x.relative || 'relative', cost: x.cost || 'cost' }; };

const qa = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Turn a free-text name into an XML element/attribute name. */
export function xmlName(name, fallback = 'item') {
    let n = String(name ?? '').trim().replace(/[\s/]+/g, '_').replace(/[^A-Za-z0-9_.-]/g, '');
    n = n.replace(/_+/g, '_').replace(/^_|_$/g, '');
    if (!n) n = fallback;
    if (!/^[A-Za-z_]/.test(n)) n = `_${n}`;
    return n;
}

function statsXml(c) {
    // Only the stats the rules config lists (sheetXml.stats: lines of { tag, of }) are sent, plus any secondary stat
    // not listed there. "of" is an attribute, a secondary key or "lift"; a value the config doesn't define is v="".
    const v = c.values;
    const val = (k) => (v[k] === undefined || v[k] === null ? '' : fmt(v[k]));
    const lift = c.lift === null || c.lift === undefined ? '' : fmt(c.lift);
    const value = (k) => (attrKeys().includes(k) ? `${c.attrs[k]}` : k === 'lift' ? lift : val(k));
    const layout = rules().sheetXml.stats;
    const used = new Set(layout.flat().map(e => e.of));
    const lines = layout.map(line => `  ${line.map(e => `<${e.tag} v="${value(e.of)}"/>`).join('')}`);
    const extra = secondaryList().filter(x => !used.has(x.key)).map(x => `<${xmlName(x.key)} v="${val(x.key)}"/>`).join('');
    if (extra) lines.push(`  ${extra}`);
    return lines.length ? ['<stats>', ...lines, '</stats>'] : [];
}

/** Wrap rows in <tag>…</tag>, or nothing when there are no rows. */
const block = (tag, rows) => (rows.length ? [`<${tag}>`, ...rows, `</${tag}>`] : []);

function traitsXml(sh) {
    return block('traits', sh.traits.filter(t => String(t.name || '').trim())
        .map(t => `  <${xmlName(t.name, 'trait')} pt="${num(t.pts)}"${t.effect ? ` effect="${qa(t.effect)}"` : ''}/>`));
}

function skillsXml(c) {
    const t = tags();
    return block('skills', c.skills.filter(s => String(s.name || '').trim() && s.level !== null)
        .map(s => `  <${xmlName(s.name, 'skill')} ${t.level}="${s.level}" Pt="${s.pts}"${s.rsl ? ` ${t.relative}="${s.rsl}"` : ''}/>`));
}

function equipmentXml(sh) {
    return block('equipment', sh.equipment.filter(e => String(e.name || '').trim()).map(e => {
        const qty = Math.max(1, num(e.qty, 1));
        const attrs = [
            qty > 1 && `qty="${qty}"`,
            num(e.weight) > 0 && `weight="${qa(`${fmt(num(e.weight))}${rules().liftUnit}`)}"`,
            num(e.value) > 0 && `value="${qa(`$${fmt(num(e.value))}`)}"`,
            e.category && `category="${qa(e.category)}"`,
            e.stat && `stat="${qa(e.stat)}"`,
            e.effect && `effect="${qa(e.effect)}"`,
        ].filter(Boolean).join(' ');
        return `  <${xmlName(e.name, 'item')} ${attrs}/>`;
    }));
}

function abilitiesXml(c) {
    const t = tags();
    return block('abilities', c.abilities.filter(a => String(a.name || '').trim()).map(a => {
        const attrs = [
            a.kind && `kind="${qa(a.kind)}"`,
            `use="${a.use}"`,
            `does="${qa(a.fxText)}"`,
            `on="${a.aim}"`,
            a.level !== null && `${t.level}="${a.level}"`,
            a.resist && `resisted_by="${a.resist}"`,
            a.use !== 'melee' && a.range > 0 && `range="${a.range}"`,
            a.use === 'melee' && `reach="${a.range > 0 ? a.range : 1}"`,
            a.cost > 0 && `${t.cost}="${a.cost}"`,
            a.effect && `effect="${qa(a.effect)}"`,
        ].filter(Boolean).join(' ');
        return `  <${xmlName(a.name, 'ability')} ${attrs}/>`;
    }));
}

function reactionsXml(sh) {
    const reactions = sh.reactions.filter(r => String(r.name || '').trim() && (r.groups || []).some(g => String(g.who || '').trim()));
    return block('reaction_modifiers', reactions.map(r => {
        const g = (r.groups || []).filter(x => String(x.who || '').trim())
            .map(x => `${xmlName(x.who, 'others')}="${qa(signed(num(x.mod)))}"`).join(' ');
        return `  <modifier name="${qa(r.name)}" ${g}/>`;
    }));
}

export function toXml(sheet) {
    const sh = normalizeSheet(sheet);
    const c = compute(sh);
    return [
        ...statsXml(c),
        ...traitsXml(sh),
        ...skillsXml(c),
        ...equipmentXml(sh),
        ...abilitiesXml(c),
        ...reactionsXml(sh),
    ].join('\n');
}
