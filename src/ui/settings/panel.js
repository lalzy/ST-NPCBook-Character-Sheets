// Extensions settings drawer: binds inputs to settings, edits the rules config and shows this chat's sheet state.
import { DEFAULTS } from '../../core/constants.js';
import { ctx, settings, applyRules } from '../../core/context.js';
import { num } from '../../utils/number.js';
import { chatChoice, generateInChat, setChatChoice } from '../../chat/generation.js';
import { BLANK_TEMPLATE, normalizeRules, rulesConfigured, formulaError } from '../../engine/index.js';
import { settingsHtml } from './template.js';

/** The settings panel line for the open chat: its sheet setting and where it comes from. */
export function renderChatState() {
    const el = $('#gs_chatstate');
    if (!el.length) return;
    const own = chatChoice();
    const hasChat = Array.isArray(ctx().chat) && !!ctx().getCurrentChatId?.();
    el.text(!hasChat ? 'No chat open.' : `This chat: ${generateInChat() ? 'ON' : 'OFF'} (${own === undefined ? 'default' : 'set in this chat'})`);
    $('#gs_chatreset').toggle(hasChat && own !== undefined);
}

function bind(html, sel, key, type) {
    const s = settings();
    const el = html.find(sel);
    if (type === 'checkbox') el.prop('checked', !!s[key]); else el.val(s[key]);
    el.on(type === 'checkbox' ? 'change' : 'input', () => {
        s[key] = type === 'checkbox' ? el.prop('checked') : num(el.val(), DEFAULTS[key]);
        ctx().saveSettingsDebounced();
    });
}

const pretty = (o) => JSON.stringify(o, null, 2);

/** Formula problems in a rules object, as text lines. */
function formulaProblems(r) {
    const out = [];
    const check = (where, f) => { const e = formulaError(f); if (e) out.push(`${where}: ${e}`); };
    r.secondary.forEach(x => check(`secondary ${x.key}`, x.base));
    for (const k of ['basicLift', 'dodge', 'parry', 'block', 'armorClass', 'unskilled']) check(k, r[k]);
    return out;
}

function renderRulesStatus() {
    const r = normalizeRules(settings().rules);
    $('#gs_rules_status').text(rulesConfigured(r) ? `Active: ${r.name || 'unnamed rules'}.` : 'Active: none (empty).');
}

function bindRules(html) {
    const box = html.find('#gs_rules');
    const msg = (t) => html.find('#gs_rules_msg').text(t);
    const save = (obj) => {
        settings().rules = obj;
        ctx().saveSettingsDebounced();
        const r = applyRules();
        box.val(pretty(obj));
        const probs = formulaProblems(r);
        msg(probs.length ? `Saved, but some formulas don't parse: ${probs.join('; ')}` : 'Saved.');
        renderRulesStatus();
        window.NPCBook?.refreshScene?.();
    };
    html.find('#gs_rules_save').on('click', () => {
        let obj;
        try { obj = JSON.parse(String(box.val() || '{}')); } catch (e) { msg(`Not valid JSON: ${e.message}`); return; }
        save(obj);
    });
    html.find('#gs_rules_template').on('click', () => { box.val(pretty(BLANK_TEMPLATE)); msg('Template inserted. Fill in the values, then Save rules.'); });
    html.find('#gs_rules_clear').on('click', () => save({}));
    html.find('#gs_rules_export').on('click', () => {
        const blob = new Blob([pretty(settings().rules || {})], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'character-sheet-rules.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    html.find('#gs_rules_import').on('click', () => html.find('#gs_rules_file').trigger('click'));
    html.find('#gs_rules_file').on('change', async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        try { save(JSON.parse(await f.text())); } catch (err) { msg(`Import failed: ${err.message}`); }
    });
}

export function mountSettings() {
    const html = $(settingsHtml(pretty(settings().rules || {})));
    $('#extensions_settings2').append(html);
    bind(html, '#gs_enabled', 'enabled', 'checkbox');
    bind(html, '#gs_send', 'sendXml', 'checkbox');
    bind(html, '#gs_gen', 'generateForNew', 'checkbox');
    html.find('#gs_gen').on('change', () => { window.NPCBook?.refreshScene?.(); renderChatState(); });
    html.find('#gs_chatreset').on('click', () => { setChatChoice(undefined); renderChatState(); });
    bindRules(html);
    renderChatState();
    renderRulesStatus();
}
