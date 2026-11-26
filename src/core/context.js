// Access to SillyTavern's context and this extension's persisted settings.
import { MODULE, DEFAULTS } from './constants.js';
import { setRules } from '../rules/ruleset.js';
import { migrateSettings, migrateChatMeta } from './migrate.js';

export const ctx = () => SillyTavern.getContext();

/** This extension's settings object (created / back-filled with defaults on first access). */
export function settings() {
    const es = ctx().extensionSettings;
    if (migrateSettings(es)) ctx().saveSettingsDebounced?.();
    if (!es[MODULE]) es[MODULE] = { ...DEFAULTS };
    for (const [k, v] of Object.entries(DEFAULTS)) if (es[MODULE][k] === undefined) es[MODULE][k] = v;
    return es[MODULE];
}

/** Load the saved rules config into the engine. */
export function applyRules() {
    return setRules(settings().rules);
}

/** This chat's metadata, with data saved under the old key moved to the current one. */
export function chatMeta() {
    const c = ctx();
    const meta = c.chatMetadata;
    if (migrateChatMeta(meta)) c.saveMetadataDebounced?.();
    return meta;
}
