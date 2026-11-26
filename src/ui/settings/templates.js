// Stored rules templates: your configs saved under names of your own ("Fantasy World", "Sci-fi"…),
// kept in this extension's settings next to the active rules. Load one to make it the active rules.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/** Markup for the templates row. `p` prefixes the element ids. */
export const templatesHtml = (p) => `
          <div class="${p}-tpl">
            <label class="${p}-tpl-pick">Stored templates
              <select id="${p}_tpl_sel" class="text_pole"></select>
            </label>
            <input id="${p}_tpl_name" class="text_pole" placeholder="Name, e.g. Fantasy World">
            <div class="${p}-tpl-btns">
              <div class="menu_button" id="${p}_tpl_load" title="Make the selected template your active rules">Load</div>
              <div class="menu_button" id="${p}_tpl_save" title="Store the rules in the box under the name typed in">Save as</div>
              <div class="menu_button" id="${p}_tpl_rename" title="Give the selected template the name typed in">Rename</div>
              <div class="menu_button" id="${p}_tpl_delete" title="Delete the selected template">Delete</div>
            </div>
          </div>`;

async function confirmBox(text) {
    const c = SillyTavern.getContext();
    try {
        if (c.Popup?.show?.confirm) return !!(await c.Popup.show.confirm('Rules templates', text));
        if (typeof c.callGenericPopup === 'function') return !!(await c.callGenericPopup(text, c.POPUP_TYPE?.CONFIRM ?? 2));
    } catch { /* fall back below */ }
    return window.confirm(text);
}

/**
 * Wire the row. list(): the stored { [name]: rules } (live), save(): persist settings,
 * current(): the rules in the box (throws on bad JSON), load(rules): make them the active rules, msg(text).
 */
export function bindTemplates(p, { list, save, current, load, msg }) {
    const $ = (id) => document.getElementById(`${p}_${id}`);
    const names = () => Object.keys(list()).sort((a, b) => a.localeCompare(b));
    const fill = (pick) => {
        const sel = $('tpl_sel');
        const all = names();
        sel.innerHTML = all.length ? all.map(n => `<option value="${esc(n)}"${n === pick ? ' selected' : ''}>${esc(n)}</option>`).join('') : '<option value="">(none stored yet)</option>';
        sel.disabled = !all.length;
    };
    const selected = () => $('tpl_sel').value || '';
    const typed = () => String($('tpl_name').value || '').trim();
    const copy = (o) => JSON.parse(JSON.stringify(o ?? {}));

    $('tpl_sel').addEventListener('change', () => { $('tpl_name').value = selected(); });
    $('tpl_load').addEventListener('click', () => {
        const n = selected();
        if (!n || !list()[n]) { msg('Pick a stored template first.'); return; }
        load(copy(list()[n]));
        $('tpl_name').value = n;
        msg(`Loaded "${n}". It is now your active rules.`);
    });
    $('tpl_save').addEventListener('click', async () => {
        const n = typed();
        if (!n) { msg('Type a name for the template first.'); return; }
        let obj;
        try { obj = current(); } catch (e) { msg(`Not valid JSON: ${e.message}`); return; }
        if (list()[n] && !(await confirmBox(`Replace the stored template "${n}" with the rules in the box?`))) return;
        list()[n] = copy(obj);
        save();
        fill(n);
        msg(`Stored the rules in the box as "${n}".`);
    });
    $('tpl_rename').addEventListener('click', () => {
        const from = selected(), to = typed();
        if (!from) { msg('Pick a stored template first.'); return; }
        if (!to || to === from) { msg('Type the new name first.'); return; }
        if (list()[to]) { msg(`There is already a template called "${to}".`); return; }
        list()[to] = list()[from];
        delete list()[from];
        save();
        fill(to);
        msg(`Renamed "${from}" to "${to}".`);
    });
    $('tpl_delete').addEventListener('click', async () => {
        const n = selected();
        if (!n) { msg('Pick a stored template first.'); return; }
        if (!(await confirmBox(`Delete the stored template "${n}"? Your active rules stay as they are.`))) return;
        delete list()[n];
        save();
        fill();
        $('tpl_name').value = '';
        msg(`Deleted "${n}".`);
    });
    fill();
}
