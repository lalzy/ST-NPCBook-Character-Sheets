// Rules templates: the shared block in the Extensions drawer of Roll Dice, NPC Book - Character Sheet and
// NPC Book - Combat Mode. The SAME file is copied into all three so they look and work alike. Change it in one,
// copy it to the other two, and bump RT_VERSION.
//
// How it works (the same everywhere):
//   - The dropdown is the active rules. Picking a template puts it in use. Built-in templates are read-only.
//   - The box shows the picked template's rules. Save (bottom right) writes them back into that template.
//   - Names are never read from the JSON. New, Duplicate and Rename ask for the name inline.
//   - Import makes a new template from a .json file; Export downloads the box's template.
//
// Stored in each extension's own settings as
//   rulesTemplates: { active: id, items: { [id]: { name, rules, updatedAt } } }
// Built-in templates come from code and are never stored.

export const RT_VERSION = 1;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const copy = (o) => JSON.parse(JSON.stringify(o ?? {}));
const pretty = (o) => JSON.stringify(o ?? {}, null, 2);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/** JSON with sorted keys, to compare two rules objects. */
export function stableJson(v) {
    if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`;
    if (isObj(v)) return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stableJson(v[k])}`).join(',')}}`;
    return JSON.stringify(v ?? null);
}

/** An id made from a name: "Fantasy World" → "fantasy-world". */
export const slugId = (name) => String(name ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'template';

/** An id for `name` that `taken(id)` says is free. */
export function uniqueId(name, taken) {
    const base = slugId(name);
    let id = base;
    for (let n = 2; taken(id); n++) id = `${base}-${n}`;
    return id;
}

/** True when v already has the shared shape. */
export const isTemplateStore = (v) => isObj(v) && typeof v.active === 'string' && isObj(v.items);

/**
 * A new store in the shared shape.
 * activeRules: the rules in use now. They become the active template: the built-in one with the same
 * rules, else a new template called activeName.
 */
export function newStore({ activeRules, activeName = 'My rules', builtIns = [] } = {}) {
    const items = {};
    let active = builtIns[0]?.id || '';
    if (isObj(activeRules)) {
        const want = stableJson(activeRules);
        const hit = builtIns.find(b => stableJson(b.rules) === want)?.id;
        if (hit) active = hit;
        else {
            active = uniqueId(activeName, (id) => builtIns.some(b => b.id === id));
            items[active] = { name: activeName, rules: copy(activeRules), updatedAt: Date.now() };
        }
    }
    return { active, items };
}

const CSS = `
.rtpl{display:flex;flex-direction:column;gap:6px;margin:6px 0}
.rtpl-head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px 10px}
.rtpl-status{opacity:.75;font-size:.9em}
.rtpl-status.dirty{opacity:1;color:#e8b83a}
.rtpl-intro{opacity:.85}
.rtpl-chat{display:flex;flex-direction:column;gap:2px}
.rtpl-chat select{margin:0}
.rtpl-pick{display:flex;gap:6px;align-items:center}
.rtpl-pick select{flex:1 1 auto;min-width:0;margin:0}
.rtpl-icons{display:flex;gap:4px;flex:none}
.rtpl .menu_button{margin:0;white-space:nowrap}
.rtpl-icons .menu_button{width:2.4em;justify-content:center}
.rtpl .menu_button.rtpl-off{opacity:.35;pointer-events:none}
.rtpl .menu_button.rtpl-pri{font-weight:bold}
.rtpl-inline{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.rtpl-inline:empty{display:none}
.rtpl-inline input{flex:1 1 10em;margin:0}
.rtpl-note{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;padding:6px 10px;border-radius:6px;border:1px solid var(--SmartThemeBorderColor,#555);font-size:.9em;width:100%}
.rtpl-note.warn{border-color:rgba(232,184,58,.6);background:rgba(232,184,58,.1)}
.rtpl-note.danger{border-color:rgba(255,110,90,.6);background:rgba(255,110,90,.1)}
.rtpl-note>span:last-child{display:flex;gap:6px}
.rtpl-json{font-family:var(--monoFontFamily,monospace);font-size:.85em;width:100%;resize:vertical;margin:0}
.rtpl-json.bad{outline:1px solid #ff6e5a}
.rtpl-json[readonly]{opacity:.75}
.rtpl-msgs{display:flex;flex-direction:column;gap:2px;font-size:.9em}
.rtpl-msgs:empty{display:none}
.rtpl-msgs .err{color:#ff8a7a}
.rtpl-msgs .warn{color:#e8b83a}
.rtpl-msgs .ok{color:#5fcf8f}
.rtpl-msgs .info{opacity:.75}
.rtpl-foot{display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap}
.rtpl-foot>div{display:flex;gap:6px;flex-wrap:wrap}
`;

function injectCss() {
    if (typeof document === 'undefined') return;
    const old = document.getElementById('rtpl-style');
    if (old && Number(old.dataset.v) >= RT_VERSION) return;
    const el = old || document.createElement('style');
    el.id = 'rtpl-style';
    el.dataset.v = String(RT_VERSION);
    el.textContent = CSS;
    if (!old) document.head.appendChild(el);
}

const btn = (act, icon, label, { title = '', cls = '', off = false, iconOnly = false } = {}) =>
    `<div class="menu_button${cls ? ` ${cls}` : ''}${off ? ' rtpl-off' : ''}" data-rt="${act}" role="button" tabindex="0" title="${esc(title || label)}" aria-label="${esc(label)}"><i class="fa-solid ${icon}"></i>${iconOnly ? '' : ` ${esc(label)}`}</div>`;

/**
 * Mount the block into `host` (an element). Options:
 *   prefix      element id prefix, e.g. 'gc'
 *   title       heading (default 'Rules templates')
 *   intro       optional HTML from the extension's own code, shown under the heading
 *   builtIns    [{ id, name, rules }] read-only templates; the first is used when nothing else is active
 *   newRules()  rules a new template starts with (default: the first built-in's)
 *   store()     the live { active, items } object in the extension's settings
 *   save()      persist the settings
 *   apply(rules, id)  make these rules the ones in use; may return a line of text to show
 *   validate(rules)   problems as text lines (shown as warnings; saving still works)
 *   exportName  file name start for Export (default 'rules')
 *   chatRow     optional { label, get(): id|'', set(id) } for a per-chat choice
 * Returns { refresh() } to redraw after something outside changed (e.g. another chat opened).
 */
export function mountRulesTemplates(host, opts) {
    injectCss();
    const o = { title: 'Rules templates', intro: '', validate: () => [], exportName: 'rules', ...opts };
    if (!o.newRules) o.newRules = () => copy(o.builtIns[0]?.rules);
    const p = o.prefix;
    const st = () => o.store();
    const builtIn = (id) => o.builtIns.find(b => b.id === id);
    const exists = (id) => !!builtIn(id) || isObj(st().items[id]);
    const activeId = () => (exists(st().active) ? st().active : o.builtIns[0].id);
    const tplOf = (id) => {
        const b = builtIn(id);
        if (b) return { id, name: b.name, rules: b.rules, builtIn: true };
        const t = st().items[id];
        return { id, name: String(t.name || id), rules: isObj(t.rules) ? t.rules : {}, builtIn: false };
    };
    const cur = () => tplOf(activeId());
    const mine = () => Object.entries(st().items).filter(([id, t]) => isObj(t) && !builtIn(id))
        .map(([id]) => tplOf(id)).sort((a, b) => a.name.localeCompare(b.name));
    const nameTaken = (name, except) => [...mine(), ...o.builtIns].some(t => t.id !== except && t.name.toLowerCase() === name.toLowerCase());

    let edit = null; // text in the box when it differs from the template ('null' = untouched)
    let mode = '';   // '' | 'new' | 'dup' | 'ren' | 'del' | 'switch'
    let pending = '';
    let msgs = [];

    const text = () => edit ?? pretty(cur().rules);
    const dirty = () => edit !== null && edit !== pretty(cur().rules);
    const parsed = () => {
        try {
            const v = JSON.parse(text());
            return isObj(v) ? { v } : { err: 'The rules must be one JSON object: { … }' };
        } catch (e) { return { err: `Not valid JSON: ${e.message}` }; }
    };
    const say = (kind, t) => { msgs = [{ kind, t }]; };
    const activate = (id) => {
        st().active = id;
        edit = null;
        o.save();
        const extra = o.apply(copy(tplOf(id).rules), id);
        return extra ? ` ${extra}` : '';
    };

    const root = document.createElement('div');
    root.className = 'rtpl';
    root.id = `${p}_rt`;
    host.appendChild(root);
    const $ = (id) => root.querySelector(`#${p}_rt_${id}`);

    function inlineHtml() {
        const t = cur();
        if (mode === 'new' || mode === 'dup' || mode === 'ren') {
            const val = mode === 'ren' ? t.name : mode === 'dup' ? `${t.name} (copy)` : '';
            const ok = mode === 'ren' ? 'Rename' : 'Create';
            return `<input id="${p}_rt_name" class="text_pole" value="${esc(val)}" placeholder="Name, e.g. Fantasy World" aria-label="Template name">`
                + btn('ok', mode === 'ren' ? 'fa-check' : 'fa-plus', ok, { cls: 'rtpl-pri' }) + btn('cancel', 'fa-xmark', 'Cancel');
        }
        if (mode === 'del') return `<div class="rtpl-note danger"><span>Delete "${esc(t.name)}"? This can't be undone.</span><span>${btn('cancel', 'fa-xmark', 'Keep')}${btn('delok', 'fa-trash-can', 'Delete', { cls: 'rtpl-pri' })}</span></div>`;
        if (mode === 'switch') return `<div class="rtpl-note danger"><span>"${esc(t.name)}" has unsaved changes.</span><span>${btn('cancel', 'fa-xmark', 'Stay')}${btn('drop', 'fa-rotate-left', 'Discard and switch')}</span></div>`;
        return '';
    }

    function render() {
        const t = cur();
        const opt = (x) => `<option value="${esc(x.id)}"${x.id === t.id ? ' selected' : ''}>${esc(x.name)}</option>`;
        const list = mine();
        const chatSel = o.chatRow ? String(o.chatRow.get() || '') : '';
        root.innerHTML = `
          <div class="rtpl-head"><b>${esc(o.title)}</b><span class="rtpl-status" id="${p}_rt_status"></span></div>
          ${o.intro ? `<small class="rtpl-intro">${o.intro}</small>` : ''}
          ${o.chatRow ? `<label class="rtpl-chat">${esc(o.chatRow.label || 'This chat uses')}
            <select id="${p}_rt_chat" class="text_pole"><option value="">The active template (${esc(t.name)})</option>
            ${[...list, ...o.builtIns].map(x => `<option value="${esc(x.id)}"${x.id === chatSel ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>` : ''}
          <div class="rtpl-pick">
            <select id="${p}_rt_sel" class="text_pole" aria-label="Active rules template">
              <optgroup label="Mine">${list.length ? list.map(opt).join('') : '<option disabled>(none yet)</option>'}</optgroup>
              <optgroup label="Built-in">${o.builtIns.map(opt).join('')}</optgroup>
            </select>
            <div class="rtpl-icons">
              ${btn('new', 'fa-plus', 'New', { title: 'New template', iconOnly: true })}
              ${btn('dup', 'fa-clone', 'Duplicate', { title: 'Duplicate this template', iconOnly: true })}
              ${btn('ren', 'fa-pen', 'Rename', { title: 'Rename this template', iconOnly: true, off: t.builtIn })}
              ${btn('del', 'fa-trash-can', 'Delete', { title: 'Delete this template', iconOnly: true, off: t.builtIn })}
            </div>
          </div>
          <div class="rtpl-inline">${inlineHtml()}</div>
          ${t.builtIn ? `<div class="rtpl-note warn"><span>Built-in rules are read-only.</span><span>${btn('dup', 'fa-clone', 'Duplicate to edit')}</span></div>` : ''}
          <textarea id="${p}_rt_json" class="text_pole rtpl-json" rows="14" spellcheck="false" aria-label="Rules JSON"${t.builtIn ? ' readonly' : ''}>${esc(text())}</textarea>
          <div class="rtpl-msgs" id="${p}_rt_msgs"></div>
          <div class="rtpl-foot">
            <div>${btn('imp', 'fa-file-import', 'Import', { title: 'New template from a .json file' })}${btn('exp', 'fa-file-export', 'Export', { title: 'Download these rules as .json' })}
              <input type="file" id="${p}_rt_file" accept=".json,application/json" hidden></div>
            <div><span id="${p}_rt_rev"></span><span id="${p}_rt_save"></span></div>
          </div>`;
        sync();
        if (mode === 'new' || mode === 'dup' || mode === 'ren') { const n = $('name'); n.focus(); n.select(); }
    }

    /** Update status, messages and buttons without touching the box (so typing is never interrupted). */
    function sync() {
        const t = cur();
        const d = dirty();
        const pr = parsed();
        const status = $('status');
        status.textContent = `Active: ${t.name}${t.builtIn ? ' (built-in)' : ''}${d ? ' · unsaved changes' : ''}`;
        status.classList.toggle('dirty', d);
        $('json').classList.toggle('bad', !!pr.err);
        let warn = [];
        if (!pr.err) { try { warn = o.validate(pr.v) || []; } catch (e) { warn = [String(e.message || e)]; } }
        $('msgs').innerHTML = [
            ...(pr.err ? [`<div class="err">✕ ${esc(pr.err)}</div>`] : []),
            ...warn.map(w => `<div class="warn">⚠ ${esc(w)}</div>`),
            ...msgs.map(m => `<div class="${m.kind}">${esc(m.t)}</div>`),
        ].join('');
        $('rev').innerHTML = btn('rev', 'fa-rotate-left', 'Revert', { title: 'Throw away the changes in the box', off: !d });
        $('save').innerHTML = btn('save', 'fa-floppy-disk', 'Save', { title: `Save into "${t.name}" and use it`, cls: 'rtpl-pri', off: !d || t.builtIn || !!pr.err });
    }

    function confirmName() {
        const name = String($('name')?.value || '').trim();
        const t = cur();
        if (!name) { say('err', 'Type a name first.'); sync(); return; }
        if (nameTaken(name, mode === 'ren' ? t.id : '')) { say('err', `There is already a template called "${name}".`); sync(); return; }
        if (mode === 'ren') {
            st().items[t.id].name = name;
            o.save();
            mode = '';
            say('ok', `Renamed to "${name}".`);
            render();
            return;
        }
        const pr = parsed();
        const rules = mode === 'dup' ? (pr.err ? copy(t.rules) : pr.v) : copy(o.newRules());
        const id = uniqueId(name, exists);
        st().items[id] = { name, rules, updatedAt: Date.now() };
        mode = '';
        const extra = activate(id);
        say('ok', `Created "${name}". It is the active rules now.${extra}`);
        render();
    }

    function act(a) {
        const t = cur();
        msgs = [];
        if (a === 'new' || a === 'dup' || a === 'ren' || a === 'del') {
            if ((a === 'ren' || a === 'del') && t.builtIn) return;
            mode = a;
        } else if (a === 'cancel') { mode = ''; pending = ''; }
        else if (a === 'ok') { confirmName(); return; }
        else if (a === 'delok') {
            const name = t.name;
            delete st().items[t.id];
            mode = '';
            const extra = activate(o.builtIns[0].id);
            say('ok', `Deleted "${name}". Now using "${cur().name}".${extra}`);
        } else if (a === 'drop') {
            const id = pending;
            pending = '';
            mode = '';
            const extra = activate(id);
            say('ok', `Now using "${cur().name}".${extra}`);
        } else if (a === 'rev') { edit = null; say('info', 'Changes thrown away.'); }
        else if (a === 'save') {
            const pr = parsed();
            if (t.builtIn || pr.err || !dirty()) return;
            st().items[t.id].rules = pr.v;
            st().items[t.id].updatedAt = Date.now();
            const extra = activate(t.id);
            say('ok', `Saved "${t.name}". It is in use now.${extra}`);
        } else if (a === 'imp') { $('file').click(); return; }
        else if (a === 'exp') {
            const pr = parsed();
            const blob = new Blob([pretty(pr.err ? t.rules : pr.v)], { type: 'application/json' });
            const el = document.createElement('a');
            el.href = URL.createObjectURL(blob);
            el.download = `${o.exportName}-${slugId(t.name)}.json`;
            el.click();
            setTimeout(() => URL.revokeObjectURL(el.href), 1000);
            say('info', `Exported "${t.name}".`);
            sync();
            return;
        }
        render();
    }

    root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-rt]');
        if (b && root.contains(b) && !b.classList.contains('rtpl-off')) act(b.dataset.rt);
    });
    root.addEventListener('keydown', (e) => {
        const b = e.target.closest?.('[data-rt]');
        if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (!b.classList.contains('rtpl-off')) act(b.dataset.rt); return; }
        if (e.target.id === `${p}_rt_name`) {
            if (e.key === 'Enter') { e.preventDefault(); confirmName(); }
            if (e.key === 'Escape') { e.preventDefault(); act('cancel'); }
        }
    });
    root.addEventListener('input', (e) => {
        if (e.target.id !== `${p}_rt_json` || cur().builtIn) return;
        edit = e.target.value;
        msgs = [];
        sync();
    });
    root.addEventListener('change', async (e) => {
        const id = e.target.id;
        if (id === `${p}_rt_sel`) {
            const want = e.target.value;
            msgs = [];
            if (dirty()) { pending = want; mode = 'switch'; render(); return; }
            mode = '';
            const extra = activate(want);
            say('ok', `Now using "${cur().name}".${extra}`);
            render();
        } else if (id === `${p}_rt_chat`) {
            o.chatRow.set(e.target.value);
            say('info', e.target.value ? 'Saved for this chat only.' : 'This chat follows the active template again.');
            sync();
        } else if (id === `${p}_rt_file`) {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            let rules;
            try { rules = JSON.parse(await f.text()); } catch (err) { say('err', `Import failed: ${err.message}`); sync(); return; }
            if (!isObj(rules)) { say('err', 'Import failed: the file must hold one JSON object { … }.'); sync(); return; }
            const base = String(f.name || 'Imported').replace(/\.json$/i, '').trim() || 'Imported';
            let name = base;
            for (let n = 2; nameTaken(name, ''); n++) name = `${base} (${n})`;
            const nid = uniqueId(name, exists);
            st().items[nid] = { name, rules, updatedAt: Date.now() };
            mode = '';
            const extra = activate(nid);
            say('ok', `Imported "${name}". It is the active rules now; rename it if you like.${extra}`);
            render();
        }
    });

    render();
    return { refresh: render };
}
