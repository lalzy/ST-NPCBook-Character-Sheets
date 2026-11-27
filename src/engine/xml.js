// Serialize a sheet into the XML block sent to the LLM.
import { normalizeSheet } from './sheet.js';
import { compute } from './compute.js';
import { num, fmt, signed } from '../utils/number.js';
import { attrKeys, rules, secondaryList, statLabel } from '../rules/ruleset.js';
import { resourceNames } from './abilities.js';
import { modTargetLabel, findItem } from './items.js';

/** Tag names from the rules config (sheetXml), with plain defaults. */
const tags = () => { const x = rules().sheetXml; return { level: x.level || 'level', cost: x.cost || 'cost' }; };

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
        .map(t => `  <${xmlName(t.name, 'trait')}${t.effect ? ` effect="${qa(t.effect)}"` : ''}/>`));
}

function skillsXml(c) {
    const t = tags();
    return block('skills', c.skills.filter(s => String(s.name || '').trim() && s.level !== null)
        .map(s => `  <${xmlName(s.name, 'skill')} ${t.level}="${s.level}"/>`));
}

const signedNum = (n) => (n > 0 ? `+${fmt(n)}` : fmt(n));

/** One block of an item as a child element. `c`: the computed sheet (an ability block's level and effect text). */
function blockXml(b, bi, e, i, c, equipment) {
    const t = tags();
    switch (b.type) {
        case 'attack': {
            const attrs = [
                String(b.label || '').trim() && `name="${qa(String(b.label).trim())}"`,
                b.roll === 'fixed' ? String(b.level ?? '').trim() !== '' && `${t.level}="${qa(b.level)}"` : String(b.skill || '').trim() && `skill="${qa(String(b.skill).trim())}"`,
                String(b.damage || '').trim() && `damage="${qa(String(b.damage).trim())}"`,
                `use="${qa(b.use || 'melee')}"`,
                b.use === 'melee' ? `reach="${num(b.range) > 0 ? fmt(num(b.range)) : 1}"` : num(b.range) > 0 && `range="${fmt(num(b.range))}"`,
                b.hits === 'auto' && 'always_hits="yes"',
            ];
            return `<attack ${attrs.filter(Boolean).join(' ')}/>`;
        }
        case 'defense': {
            const attrs = b.kind === 'block'
                ? ['kind="block"', String(b.skill || '').trim() && `skill="${qa(String(b.skill).trim())}"`, num(b.value) && `bonus="${qa(signedNum(num(b.value)))}"`]
                : ['kind="armor"', `value="${qa(fmt(num(b.value)))}"`, `slots="${qa(String(b.slots || '').trim() || 'all')}"`];
            return `<defense ${attrs.filter(Boolean).join(' ')}/>`;
        }
        case 'modifier':
            if (!num(b.amount)) return '';
            return `<modifier amount="${qa(signedNum(num(b.amount)))}" to="${qa(modTargetLabel(b.target, statLabel))}" when="${qa(b.when || 'equipped')}"/>`;
        case 'ability': {
            if (!String(b.name || '').trim()) return '';
            const a = (c.itemAbilities || []).find(x => x.itemIndex === i && x.blockIndex === bi);
            return a ? `<ability name="${qa(String(b.name).trim())}" ${abilityAttrs(a)}/>` : `<ability name="${qa(String(b.name).trim())}"${b.effect ? ` effect="${qa(b.effect)}"` : ''}/>`;
        }
        case 'charges': {
            const left = String(b.left ?? '').trim();
            const max = String(b.max ?? '').trim();
            return `<charges name="${qa(String(b.name || '').trim() || 'Charges')}" left="${left === '' ? 'unlimited' : qa(fmt(num(left)))}"${max !== '' ? ` max="${qa(fmt(num(max)))}"` : ''}/>`;
        }
        case 'consumes': {
            if (b.from === 'pool') return String(b.pool || '').trim() ? `<consumes pool="${qa(String(b.pool).trim())}" per_use="${fmt(Math.max(0, num(b.per, 1)))}"/>` : '';
            if (!String(b.item || '').trim()) return '';
            const src = findItem(equipment, b.item);
            return `<consumes item="${qa(String(b.item).trim())}" per_use="${fmt(Math.max(0, num(b.per, 1)))}" left="${src ? fmt(Math.max(0, num(src.qty, 1))) : 0}"/>`;
        }
        default: return '';
    }
}

/**
 * Items: name as the tag; qty, category (as typed, a label only), equipped="no" when switched off, weight, value, story
 * notes. Items with blocks get one child element per block; old items without blocks still send their stat text.
 */
function equipmentXml(sh, c) {
    const rows = [];
    sh.equipment.forEach((e, i) => {
        if (!String(e.name || '').trim()) return;
        const qty = Math.max(0, num(e.qty, 1));
        const attrs = [
            qty !== 1 && `qty="${fmt(qty)}"`,
            String(e.category || '').trim() && `category="${qa(String(e.category).trim())}"`,
            e.equipped === false && 'equipped="no"',
            num(e.weight) > 0 && `weight="${qa(`${fmt(num(e.weight))}${rules().liftUnit}`)}"`,
            num(e.value) > 0 && `value="${qa(`$${fmt(num(e.value))}`)}"`,
            e.effect && `effect="${qa(e.effect)}"`,
        ].filter(Boolean).join(' ');
        const tag = xmlName(e.name, 'item');
        const open = `${tag}${attrs ? ` ${attrs}` : ''}`;
        const kids = (Array.isArray(e.blocks) ? e.blocks : []).map((b, bi) => blockXml(b, bi, e, i, c, sh.equipment)).filter(Boolean);
        if (!kids.length) rows.push(`  <${open}/>`);
        else rows.push(`  <${open}>`, ...kids.map(k => `    ${k}`), `  </${tag}>`);
    });
    return block('equipment', rows);
}

/** The attributes describing a computed ability (the character's own or one stored on an item). */
function abilityAttrs(a) {
    const t = tags();
    return [
        a.kind && `kind="${qa(a.kind)}"`,
        `use="${a.use}"`,
        `does="${qa(a.fxText)}"`,
        `on="${a.aim}"`,
        a.level !== null && `${t.level}="${a.level}"`,
        a.resist && a.dc === null && `resisted_by="${a.resist}"`,
        a.resist && a.dc !== null && `save="${qa(`${a.resist} DC ${a.dc}${a.save === 'half' ? ', half on save' : ''}`)}"`,
        a.use !== 'melee' && a.range > 0 && `range="${a.range}"`,
        a.use === 'melee' && `reach="${a.range > 0 ? a.range : 1}"`,
        String(a.defendWith || '').trim() && `defended_by="${qa(String(a.defendWith).trim())}"`,
        a.castTime > 1 && `cast_time="${a.castTime} turns"`,
        a.hits === 'auto' && 'always_hits="yes"',
        a.cost > 0 && `${t.cost}="${qa(`${a.cost}${a.resource && (a.pool || resourceNames().length > 1) ? ` ${a.resource}` : ''}`)}"`,
        a.effect && `effect="${qa(a.effect)}"`,
    ].filter(Boolean).join(' ');
}

function abilitiesXml(c) {
    return block('abilities', c.abilities.filter(a => String(a.name || '').trim())
        .map(a => `  <${xmlName(a.name, 'ability')} ${abilityAttrs(a)}/>`));
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
        ...equipmentXml(sh, c),
        ...abilitiesXml(c),
        ...reactionsXml(sh),
    ].join('\n');
}
