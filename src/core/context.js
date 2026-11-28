// Access to SillyTavern's context and this extension's persisted settings.
import { MODULE, DEFAULTS } from './constants.js';
import { setRules } from '../rules/ruleset.js';
import { BUILT_INS } from './builtins.js';
import { isTemplateStore, newStore, templateRules } from '../ui/rulesTemplates.js';

export const ctx = () => SillyTavern.getContext();

/** This extension's settings object (created / back-filled with defaults on first access). */
export function settings() {
    const es = ctx().extensionSettings;
    if (!es[MODULE]) es[MODULE] = { ...DEFAULTS };
    for (const [k, v] of Object.entries(DEFAULTS)) if (es[MODULE][k] === undefined) es[MODULE][k] = v;
    const s = es[MODULE];
    // rules: only the active template's id is kept. An older install kept a copy of the rules in `rules`: it becomes a
    // template (a copy of a built-in becomes that built-in again), then the copy goes.
    if (!isTemplateStore(s.rulesTemplates)) {
        const old = s.rules && typeof s.rules === 'object' && !Array.isArray(s.rules) ? s.rules : null;
        s.rulesTemplates = newStore({ activeRules: old, activeName: 'My rules', builtIns: BUILT_INS });
        ctx().saveSettingsDebounced?.();
    }
    if ('rules' in s) { delete s.rules; ctx().saveSettingsDebounced?.(); }
    return s;
}

/** The active rules template's rules, fetched by its id now (a built-in straight from code). */
export const activeRules = () => templateRules(settings().rulesTemplates, BUILT_INS);

/** Load the active template's rules into the engine (at start, and when another template is picked). */
export function applyRules() {
    return setRules(activeRules());
}

/** This chat's metadata. */
export const chatMeta = () => ctx().chatMetadata;
