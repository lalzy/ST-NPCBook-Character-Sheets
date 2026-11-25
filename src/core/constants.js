// Extension-wide identifiers and defaults.
// MODULE and EXT_ID are storage keys kept from earlier versions so saved settings and sheets still load.

export const MODULE = 'npc_book_gurps';
export const EXT_ID = 'gurps';
export const TITLE = 'NPC Book Character Sheet';

export const DEFAULTS = { enabled: true, sendXml: true, generateForNew: true, rules: {} };

/** Suggested inventory categories (datalist). */
export const CATEGORIES = ['weapon', 'armor', 'shield', 'clothing', 'tool', 'supplies', 'valuable', 'consumable', 'misc'];
