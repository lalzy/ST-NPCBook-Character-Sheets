// Extension-wide identifiers and defaults.
// MODULE: this extension's key in SillyTavern's settings and chat metadata. EXT_ID: its id with NPC Book and Roll Dice
// (sheets are stored under it in NPC Book cards and personas). Both match the folder name.
export const MODULE = 'NPC_Book_character_sheet';
export const EXT_ID = 'NPC_Book_character_sheet';
// Keys used by earlier versions; data stored under them is moved to the new keys (see core/migrate.js).
export const LEGACY_MODULE = 'npc_book_gurps';
export const LEGACY_EXT_ID = 'gurps';
export const TITLE = 'NPC Book - Character Sheet';

import { GENERIC_RULES } from '../rules/generic.js';

/** New installs start with the generic rule set (Settings → Rules: pick another template or edit it). */
export const DEFAULTS = { enabled: true, sendXml: true, generateForNew: true, rules: JSON.parse(JSON.stringify(GENERIC_RULES)), ruleTemplates: {} };

/** Suggested inventory categories (datalist). */
export const CATEGORIES = ['weapon', 'armor', 'shield', 'clothing', 'tool', 'supplies', 'valuable', 'consumable', 'misc'];
