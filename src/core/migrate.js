// Moves data saved by earlier versions under the old keys (settings 'npc_book_gurps', NPC Book extension id 'gurps')
// to the current keys. Each step only runs when there is something under an old key, and never overwrites data
// already saved under the new key.
import { MODULE, EXT_ID, LEGACY_MODULE, LEGACY_EXT_ID } from './constants.js';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/** Settings: extensionSettings.npc_book_gurps → extensionSettings[MODULE]. True when something moved. */
export function migrateSettings(es) {
    if (!isObj(es) || !(LEGACY_MODULE in es)) return false;
    if (!isObj(es[MODULE])) es[MODULE] = es[LEGACY_MODULE];
    delete es[LEGACY_MODULE];
    return true;
}

/** Chat metadata: chatMetadata.npc_book_gurps → chatMetadata[MODULE]. True when something moved. */
export function migrateChatMeta(meta) {
    if (!isObj(meta) || !(LEGACY_MODULE in meta)) return false;
    if (!isObj(meta[MODULE])) meta[MODULE] = meta[LEGACY_MODULE];
    delete meta[LEGACY_MODULE];
    return true;
}

/** A card / instance / persona holder with `ext`: ext.gurps → ext[EXT_ID]. True when something moved. */
export function migrateExt(holder) {
    const ext = holder?.ext;
    if (!isObj(ext) || !(LEGACY_EXT_ID in ext)) return false;
    if (!isObj(ext[EXT_ID])) ext[EXT_ID] = ext[LEGACY_EXT_ID];
    delete ext[LEGACY_EXT_ID];
    return true;
}

/** Every card in a { id: card } map (or a list). Returns how many moved. */
export function migrateCards(cards) {
    const list = Array.isArray(cards) ? cards : isObj(cards) ? Object.values(cards) : [];
    return list.reduce((n, c) => n + (migrateExt(c) ? 1 : 0), 0);
}

/**
 * Pick the sheet stored under the current key, falling back to one stored under the old key
 * while it hasn't been moved yet (the current key's value may be NPC Book's blank default).
 */
export function currentOrLegacy(current, legacy, isBlank) {
    if (current && !(isBlank?.(current))) return current;
    return legacy || current || null;
}
