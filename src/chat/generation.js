// Per-chat choice: do new NPCs in this chat get a character sheet?
import { MODULE } from '../core/constants.js';
import { ctx, settings, chatMeta } from '../core/context.js';

const listeners = new Set();

/** Subscribe to changes of this chat's choice (used by the settings panel). */
export function onChatChoiceChange(fn) { listeners.add(fn); }

/** This chat's choice for generating sheets for new NPCs: true / false, or undefined = follow the default setting. */
export function chatChoice() {
    const v = chatMeta()?.[MODULE]?.generate;
    return typeof v === 'boolean' ? v : undefined;
}

/** Whether new NPCs in this chat get a character sheet: the chat's own choice, else the default from settings. */
export function generateInChat() {
    const v = chatChoice();
    return v === undefined ? !!settings().generateForNew : v;
}

export function setChatChoice(value) {
    const meta = chatMeta();
    if (!meta) return;
    if (value === undefined) { if (meta[MODULE]) delete meta[MODULE].generate; }
    else meta[MODULE] = { ...(meta[MODULE] || {}), generate: value };
    ctx().saveMetadataDebounced?.();
    window.NPCBook?.refreshScene();
    for (const fn of listeners) fn();
}
