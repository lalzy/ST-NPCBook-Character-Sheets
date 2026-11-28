// Registers the character sheet as an NPC Book extension (card tab, persona sheet, scene XML, tracker hooks).
import { EXT_ID, TITLE } from '../../core/constants.js';
import { settings } from '../../core/context.js';
import { defaultSheet, normalizeSheet, toXml, sheetFromLLM } from '../../engine/index.js';
import { generateInChat } from '../../chat/generation.js';
import { renderSheet } from '../../ui/sheet/index.js';
import { newNpcRule, addSheetToExample } from './prompt.js';
import { sceneButton } from './sceneButton.js';
import { renderEquipment } from '../../ui/sheet/equipment.js';

let npcBook = null;

/** The sheet to send: this chat's copy when it is switched on, else the NPC's library card when that one is on. null = none. */
function sheetFor({ kind, data, instance, id }) {
    const own = data ? normalizeSheet(data) : null;
    if (own?.enabled || kind !== 'char') return own?.enabled ? own : null;
    const tid = instance?.instanceOf ?? id;
    const card = npcBook?.getExtData(tid, EXT_ID, { scope: 'template' });
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
    const g = entry?.sheet;
    if (!s.enabled || !generateInChat() || !g) return null;
    return sheetFromLLM(g);
}

const definition = () => ({
    id: EXT_ID,
    label: 'Sheet',
    sheetLabel: 'Character Sheet',
    defaultData: () => defaultSheet(),
    cardTab: { label: 'Sheet', icon: 'fa-users-viewfinder', render: (host, { data, template }) => renderSheet(host, data, { prefix: template?.name ? `${template.name}'s` : '', key: template?.id }) },
    personaSheet: { label: 'Character Sheet', icon: 'fa-users-viewfinder', render: (host, { data }) => renderSheet(host, data, { prefix: '', key: 'user' }) },
    sceneXml,
    sceneXmlAlways: true, // also asked for NPCs whose chat copy has no sheet, so the card's sheet can be used
    instructions,
    transformInstructions,
    fromTracker,
    sceneButton,
    // The Equipment tab on the scene cards (NPC Book API 14): what the character holds now
    sceneTabs: [{ id: 'equipment', label: 'Equipment', icon: 'fa-hand-fist', kinds: ['char', 'user'], render: renderEquipmentTab }],
});

/**
 * An NPC whose chat copy has no sheet of its own uses its card's sheet (as the prompt does): the tab starts from a copy
 * of it, and Save makes it this chat's own copy.
 */
function renderEquipmentTab(host, ctx) {
    if (ctx.kind === 'char' && !normalizeSheet(ctx.data).enabled) {
        const tid = ctx.instance?.instanceOf ?? ctx.id;
        const card = npcBook?.getExtData(tid, EXT_ID, { scope: 'template' });
        if (card && normalizeSheet(card).enabled) Object.assign(ctx.data, JSON.parse(JSON.stringify(card)));
    }
    renderEquipment(host, ctx.data);
}

/** The sheet a scene character uses now (key: 'user' or an NPC id) and where it is stored, or null. */
export function sheetOfKey(key) {
    if (!npcBook) return null;
    if (key === 'user') { const d = npcBook.getPersonaData(EXT_ID); return d ? { data: normalizeSheet(d), ref: null, scope: 'persona' } : null; }
    const inst = npcBook.getInstance(key);
    if (!inst) return null;
    const own = inst.ext?.[EXT_ID];
    if (own && normalizeSheet(own).enabled) return { data: normalizeSheet(JSON.parse(JSON.stringify(own))), ref: inst.id, scope: 'instance' };
    const card = npcBook.getExtData(inst.instanceOf ?? inst.id, EXT_ID, { scope: 'template' });
    return card && normalizeSheet(card).enabled ? { data: normalizeSheet(card), ref: inst.id, scope: 'instance' } : null;
}

/** Store a scene character's sheet (as found by sheetOfKey). */
export function storeSheetOfKey(found, data) {
    return !!npcBook?.setExtData(found.ref, EXT_ID, data, { scope: found.scope });
}

export function register(api) {
    npcBook = api;
    api.registerExtension(definition());
    // Run the example hook after other extensions' (e.g. Combat Mode adds an enemy to the example):
    // registering again later moves this extension to the end of NPC Book's list.
    setTimeout(() => { api.unregisterExtension(EXT_ID); api.registerExtension(definition()); }, 3000);
}

/** Register now if NPC Book is loaded, otherwise when it announces itself; warn if it never shows up. */
export function initNpcBook() {
    if (window.NPCBook?.registerExtension) register(window.NPCBook);
    else document.addEventListener('npcbook:ready', (e) => register(e.detail), { once: true });
    setTimeout(() => { if (!window.NPCBook) toastr.warning(`${TITLE} needs the NPC Book extension.`, TITLE); }, 15000);
}
