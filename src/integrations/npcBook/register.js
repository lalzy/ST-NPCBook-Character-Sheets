// Registers the character sheet as an NPC Book extension (card tab, persona sheet, scene XML, tracker hooks).
import { EXT_ID, LEGACY_EXT_ID, TITLE } from '../../core/constants.js';
import { ctx, settings } from '../../core/context.js';
import { migrateCards, migrateExt, currentOrLegacy } from '../../core/migrate.js';
import { defaultSheet, normalizeSheet, isBlankSheet, toXml, sheetFromLLM } from '../../engine/index.js';
import { generateInChat } from '../../chat/generation.js';
import { renderSheet } from '../../ui/sheet/index.js';
import { newNpcRule, addSheetToExample } from './prompt.js';
import { sceneButton } from './sceneButton.js';

let npcBook = null;

/** The sheet to send: this chat's copy when it is switched on, else the NPC's library card when that one is on. null = none. */
function sheetFor({ kind, data, instance, id }) {
    const own = data ? normalizeSheet(data) : null;
    if (own?.enabled || kind !== 'char') return own?.enabled ? own : null;
    const tid = instance?.instanceOf ?? id;
    const card = currentOrLegacy(npcBook?.getExtData?.(tid, EXT_ID, { scope: 'template' }), npcBook?.getExtData?.(tid, LEGACY_EXT_ID, { scope: 'template' }), isBlankSheet);
    const c = card ? normalizeSheet(card) : null;
    return c?.enabled ? c : null;
}

function sceneXml(subject) {
    const s = settings();
    const sheet = sheetFor(subject);
    // A sheet that is on is always sent, also when it still holds only defaults.
    if (!s.enabled || !s.sendXml || !sheet) return '';
    const xml = toXml(sheet);
    if (!xml) return '<sheet></sheet>';
    // Extends NPC Book's own block for this character: everything from the sheet goes inside one <sheet> element.
    return ['<sheet>', ...xml.split('\n').map(l => `  ${l}`), '</sheet>'].join('\n');
}

function instructions({ autoCreate }) {
    const s = settings();
    return s.enabled && autoCreate && generateInChat() ? newNpcRule() : '';
}

/** Put a "sheet" into each new character of NPC Book's example (same switch as the instruction line). */
function transformInstructions(text, { autoCreate } = {}) {
    const s = settings();
    return s.enabled && autoCreate && generateInChat() ? addSheetToExample(text) : undefined;
}

function fromTracker(entry) {
    const s = settings();
    const g = entry?.sheet ?? entry?.[EXT_ID] ?? entry?.[LEGACY_EXT_ID]; // older chats used the extension id as the key
    if (!s.enabled || !generateInChat() || !g) return null;
    return sheetFromLLM(g);
}

/**
 * A sheet saved by an earlier version under the old extension id: copy it into NPC Book's draft for the current id
 * (the draft is saved by NPC Book), so the card or persona keeps its sheet.
 */
function adoptLegacy(data, legacy) {
    if (data && typeof data === 'object' && legacy && typeof legacy === 'object' && isBlankSheet(data) && !isBlankSheet(legacy)) {
        for (const k of Object.keys(data)) delete data[k];
        Object.assign(data, structuredClone(legacy));
    }
    return data;
}

/** Move sheets stored under the old extension id in NPC Book's library and the current scene to the current id. */
function migrateNpcBook(api) {
    let n = 0;
    try {
        n += migrateCards(api.getLibrary?.());
        for (const r of api.getScene?.()?.roster || []) { if (migrateExt(r)) n++; if (migrateExt(r.template)) n++; }
    } catch (e) { console.warn(`[${TITLE}] moving old sheets failed`, e); }
    if (n) ctx().saveSettingsDebounced?.();
}

const definition = () => ({
    id: EXT_ID,
    label: 'Sheet',
    sheetLabel: 'Character Sheet',
    defaultData: () => defaultSheet(),
    cardTab: { label: 'Sheet', icon: 'fa-users-viewfinder', render: (host, { data, template }) => renderSheet(host, adoptLegacy(data, template?.ext?.[LEGACY_EXT_ID]), { prefix: template?.name ? `${template.name}'s` : '', key: template?.id }) },
    personaSheet: { label: 'Character Sheet', icon: 'fa-users-viewfinder', render: (host, { data }) => renderSheet(host, adoptLegacy(data, npcBook?.getPersonaData?.(LEGACY_EXT_ID)), { prefix: '', key: 'user' }) },
    sceneXml,
    sceneXmlAlways: true, // also asked for NPCs whose chat copy has no sheet, so the card's sheet can be used
    instructions,
    transformInstructions,
    fromTracker,
    sceneButton,
});

export function register(api) {
    npcBook = api;
    migrateNpcBook(api);
    api.registerExtension(definition());
    // Run the example hook after other extensions' (e.g. Combat Mode adds an enemy to the example):
    // registering again later moves this extension to the end of NPC Book's list.
    setTimeout(() => { api.unregisterExtension?.(EXT_ID); api.registerExtension(definition()); }, 3000);
}

/** Register now if NPC Book is loaded, otherwise when it announces itself; warn if it never shows up. */
export function initNpcBook() {
    if (window.NPCBook?.registerExtension) register(window.NPCBook);
    else document.addEventListener('npcbook:ready', (e) => register(e.detail), { once: true });
    setTimeout(() => { if (!window.NPCBook) toastr.warning(`${TITLE} needs the NPC Book extension.`, TITLE); }, 15000);
}
