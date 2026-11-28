// Extension-wide identifiers and defaults.
// MODULE: this extension's key in SillyTavern's settings and chat metadata. EXT_ID: its id with NPC Book and Roll Dice
// (sheets are stored under it in NPC Book cards and personas). Both match the folder name.
export const MODULE = 'NPC_Book_character_sheet';
export const EXT_ID = 'NPC_Book_character_sheet';
export const TITLE = 'NPC Book - Character Sheet';


/** New installs start with the generic rule set (Settings → Rules: pick another template or edit it). */
// rules: only the active template's id is stored (rulesTemplates); the rules are read by it (core/context.js activeRules)
export const DEFAULTS = { enabled: true, sendXml: true, generateForNew: true };

/** Suggested inventory categories (datalist). */
export const CATEGORIES = ['weapon', 'armor', 'shield', 'clothing', 'tool', 'supplies', 'valuable', 'consumable', 'misc'];
