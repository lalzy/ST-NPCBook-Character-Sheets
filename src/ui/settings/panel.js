// Extensions settings drawer: binds inputs to settings, edits the rules config and shows this chat's sheet state.
import { DEFAULTS } from '../../core/constants.js';
import { ctx, settings, applyRules } from '../../core/context.js';
import { num } from '../../utils/number.js';
import { chatChoice, generateInChat, setChatChoice } from '../../chat/generation.js';
import { BLANK_TEMPLATE, normalizeRules, formulaError } from '../../engine/index.js';
import { settingsHtml } from './template.js';
import { GENERIC_RULES } from '../../rules/generic.js';
import { mountRulesTemplates, isTemplateStore, newStore } from '../rulesTemplates.js';

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

/** Formula problems in a rules object, as text lines. */
function formulaProblems(r) {
    const out = [];
    const check = (where, f) => { const e = formulaError(f); if (e) out.push(`${where}: ${e}`); };
    r.secondary.forEach(x => check(`secondary ${x.key}`, x.base));
    for (const k of ['basicLift', 'dodge', 'parry', 'block', 'armorClass', 'unskilled']) check(k, r[k]);
    return out;
}

/** The rules templates in the shared shape (made on first use). */
function templateStore() {
    const s = settings();
    if (!isTemplateStore(s.rulesTemplates)) {
        s.rulesTemplates = newStore({ activeRules: s.rules || {}, activeName: 'My rules', builtIns: BUILT_INS });
        ctx().saveSettingsDebounced();
    }
    return s.rulesTemplates;
}

const BUILT_INS = [{ id: 'builtin:generic', name: 'Generic (default)', rules: GENERIC_RULES }, { id: 'builtin:none', name: 'None (no rules)', rules: {} }];

function mountRules(html) {
    const host = html.find('#gs_rules_tpl')[0];
    mountRulesTemplates(host, {
        prefix: 'gs',
        intro: 'The extension starts with <b>Generic (default)</b>: a simple, playable rule set of its own (four attributes, a small damage table, item presets), not taken from any published game. Edit it, or pick <b>None</b> and fill in costs, tables and formulas from your own copy of the rules. New templates start with every key, empty. See RULES.md for a step-by-step guide.',
        builtIns: BUILT_INS,
        newRules: () => JSON.parse(JSON.stringify(BLANK_TEMPLATE)),
        store: templateStore,
        save: () => ctx().saveSettingsDebounced(),
        validate: (obj) => formulaProblems(normalizeRules(obj)),
        apply: (obj) => {
            settings().rules = obj;
            ctx().saveSettingsDebounced();
            const r = applyRules();
            window.NPCBook?.refreshScene();
            return r.macros.length ? `Home-brew macros: ${r.macros.map(m => `{{${m.name}}}`).join(', ')} (Combat Mode applies them).` : '';
        },
        exportName: 'character-sheet-rules',
    });
}

export function mountSettings() {
    const html = $(settingsHtml());
    $('#extensions_settings2').append(html);
    bind(html, '#gs_enabled', 'enabled', 'checkbox');
    bind(html, '#gs_send', 'sendXml', 'checkbox');
    bind(html, '#gs_gen', 'generateForNew', 'checkbox');
    html.find('#gs_gen').on('change', () => { window.NPCBook?.refreshScene(); renderChatState(); });
    html.find('#gs_chatreset').on('click', () => { setChatChoice(undefined); renderChatState(); });
    mountRules(html);
    renderChatState();
}
