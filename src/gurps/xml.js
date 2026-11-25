// Serialize a sheet into the XML block sent to the LLM.
import { normalizeSheet } from './sheet.js';
import { compute } from './compute.js';
import { num, fmt, signed } from '../utils/number.js';

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
    const v = c.values;
    return [
        '<stats>',
        `  <ST v="${c.attrs.ST}"/><DX v="${c.attrs.DX}"/><IQ v="${c.attrs.IQ}"/><HT v="${c.attrs.HT}"/>`,
        `  <HP v="${v.HP}"/><FP v="${v.FP}"/><WILL v="${v.Will}"/><Fright v="${v.Fright}"/>`,
        `  <Per v="${v.Per}"/><Vision v="${v.Vision}"/><Hearing v="${v.Hearing}"/><TasteSmell v="${v.TasteSmell}"/><Touch v="${v.Touch}"/>`,
        `  <BasicSpeed v="${fmt(v.BasicSpeed)}"/><BasicMove v="${v.BasicMove}"/><BasicLift v="${fmt(v.BasicLift)}"/>`,
        '</stats>',
    ];
}

/** Wrap rows in <tag>…</tag>, or nothing when there are no rows. */
const block = (tag, rows) => (rows.length ? [`<${tag}>`, ...rows, `</${tag}>`] : []);

function traitsXml(sh) {
    return block('traits', sh.traits.filter(t => String(t.name || '').trim())
        .map(t => `  <${xmlName(t.name, 'trait')} pt="${num(t.pts)}"${t.effect ? ` effect="${qa(t.effect)}"` : ''}/>`));
}

function skillsXml(c) {
    return block('skills', c.skills.filter(s => String(s.name || '').trim() && s.level !== null)
        .map(s => `  <${xmlName(s.name, 'skill')} SL="${s.level}" Pt="${s.pts}" RSL="${s.rsl}"/>`));
}

function equipmentXml(sh) {
    return block('equipment', sh.equipment.filter(e => String(e.name || '').trim()).map(e => {
        const qty = Math.max(1, num(e.qty, 1));
        const attrs = [
            qty > 1 && `qty="${qty}"`,
            num(e.weight) > 0 && `weight="${qa(`${fmt(num(e.weight))}lb`)}"`,
            num(e.value) > 0 && `value="${qa(`$${fmt(num(e.value))}`)}"`,
            e.category && `category="${qa(e.category)}"`,
            e.stat && `stat="${qa(e.stat)}"`,
            e.effect && `effect="${qa(e.effect)}"`,
        ].filter(Boolean).join(' ');
        return `  <${xmlName(e.name, 'item')} ${attrs}/>`;
    }));
}

function abilitiesXml(c) {
    return block('abilities', c.abilities.filter(a => String(a.name || '').trim()).map(a => {
        const attrs = [
            a.kind && `kind="${qa(a.kind)}"`,
            `use="${a.use}"`,
            `does="${qa(a.fxText)}"`,
            `on="${a.aim}"`,
            `SL="${a.level}"`,
            a.resist && `resisted_by="${a.resist}"`,
            a.use !== 'melee' && a.range > 0 && `range="${a.range}"`,
            a.use === 'melee' && `reach="${a.range > 0 ? a.range : 1}"`,
            a.cost > 0 && `FP="${a.cost}"`,
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
