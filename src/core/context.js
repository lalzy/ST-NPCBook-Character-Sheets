// Access to SillyTavern's context and this extension's persisted settings.
import { MODULE, DEFAULTS } from './constants.js';
import { setRules } from '../rules/ruleset.js';

export const ctx = () => SillyTavern.getContext();

/** This extension's settings object (created / back-filled with defaults on first access). */
export function settings() {
    const es = ctx().extensionSettings;
    if (!es[MODULE]) es[MODULE] = { ...DEFAULTS };
    for (const [k, v] of Object.entries(DEFAULTS)) if (es[MODULE][k] === undefined) es[MODULE][k] = v;
    delete es[MODULE].gurpsRolls; // removed: crit rules now live in Roll Dice's own settings
    return es[MODULE];
}

/** Load the saved rules config into the engine. */
export function applyRules() {
    return setRules(settings().rules);
}
