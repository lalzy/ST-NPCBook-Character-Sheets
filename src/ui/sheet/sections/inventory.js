// Inventory: each item is a card. Name, qty, weight, value, category (a label only), equipped, story notes, and any
// number of optional blocks (Attack, Defense, Modifier, Ability, Uses/charges, Consumes), each added and removed freely.
// Every field has a label above it and a hint below it. Lists come from the active rules and the sheet.
import { CATEGORIES } from '../../../core/constants.js';
import { esc } from '../../../utils/html.js';
import { rollDice } from '../../../integrations/rollDice/index.js';
import {
    skillAttrs, statLabel, itemBlocks, modTargets, modTargetLabel, SLOT_SUGGESTIONS, MOD_WHEN, ammoCandidates, chargesOf,
    ammoOf, combatActions, resourceNames, consumablePools, rules, ABILITY_FX, ABILITY_AIMS, ABILITY_USES, ABILITY_STATS, SAVE_RESULTS, DICE_FX, resistAttrs,
} from '../../../engine/index.js';
import { emptyRow } from '../widgets.js';
import { inventoryLabel, encumbranceLine } from '../labels.js';
import { USE_LABEL, FX_LABEL, SAVE_LABEL, AIM_LABEL, STAT_LABEL } from './abilities.js';

/** Item cards the user has opened (UI state only, not saved). */
export const openItems = new WeakSet();

export const BLOCK_LABEL = { attack: 'Attack', defense: 'Defense', modifier: 'Modifier', ability: 'Ability', charges: 'Uses / charges', consumes: 'Consumes' };
const BLOCK_HINT = {
    attack: 'A way to attack with this item. Add more for e.g. swing and thrust.',
    defense: 'Armor it gives (with the body slots it covers), or a block roll.',
    modifier: 'A bonus or penalty to anything your rules define.',
    ability: 'An ability stored on the item. The wielder does not need to know it.',
    charges: 'A count that item abilities can spend. Empty = unlimited.',
    consumes: 'Another item used up on each attack (arrows, bolts, shells…).',
};

/** Item presets: they only add empty blocks, no numbers and no rule-set choices. */
export const ITEM_PRESETS = {
    blank: { label: 'Blank', category: '', blocks: [] },
    melee: { label: 'Melee weapon', category: 'weapon', blocks: [{ type: 'attack', use: 'melee' }] },
    ranged: { label: 'Ranged weapon', category: 'weapon', blocks: [{ type: 'attack', use: 'ranged' }, { type: 'consumes' }] },
    armor: { label: 'Armor', category: 'armor', blocks: [{ type: 'defense', kind: 'armor' }] },
    shield: { label: 'Shield', category: 'shield', blocks: [{ type: 'defense', kind: 'block' }] },
    magic: { label: 'Magic item', category: '', blocks: [{ type: 'ability' }, { type: 'charges' }] },
    ammo: { label: 'Ammo', category: 'ammo', qty: 20, blocks: [] },
};

const opts = (list, selected, label = (x) => x) => list.map(x => `<option value="${esc(x)}" ${String(x) === String(selected ?? '') ? 'selected' : ''}>${esc(label(x))}</option>`).join('');

/** A labelled field: label above, hint below. */
const field = (label, inner, hint = '', cls = '') => `<label class="gs-fld ${cls}"><span class="gs-fl">${label}</span>${inner}${hint ? `<span class="gs-fh">${hint}</span>` : ''}</label>`;

const bIn = (b, f, attrs = '', ph = '') => `<input class="text_pole gs-bf" data-field="${f}" value="${esc(b[f] ?? '')}" ${ph ? `placeholder="${esc(ph)}"` : ''} ${attrs}>`;
const bSel = (f, inner, attrs = '') => `<select class="text_pole gs-bf" data-field="${f}" ${attrs}>${inner}</select>`;
const dis = (on) => (on ? '' : 'disabled');

/** Skill / attribute choice: (auto) first, then the rules' attributes and secondary stats, then the sheet's skills. */
function skillOptions(data, selected, autoLabel = '(auto)') {
    const skills = [...new Set(data.skills.map(s => String(s.name || '').trim()).filter(Boolean))];
    const known = !selected || skillAttrs().includes(selected) || skills.includes(selected);
    return `<option value="">${autoLabel}</option>
        ${skillAttrs().length ? `<optgroup label="Attributes">${opts(skillAttrs(), selected, statLabel)}</optgroup>` : ''}
        ${skills.length ? `<optgroup label="Skills">${opts(skills, selected)}</optgroup>` : ''}
        ${known ? '' : `<option selected>${esc(selected)}</option>`}`;
}

const rollFields = (data, b) => `
    ${field('Rolled against', bSel('roll', opts(['skill', 'fixed'], b.roll || 'skill', x => (x === 'fixed' ? 'Fixed number / formula' : "Wielder's skill / attribute"))), 'What the roll uses.')}
    ${b.roll === 'fixed'
        ? field('Level / target', bIn(b, 'level', '', 'e.g. 15 or Dex+2'), 'A number or formula from your rules.')
        : field('Skill', bSel('skill', skillOptions(data, b.skill)), 'Auto: a skill named like the item or its category.')}`;

function attackBlock(data, b) {
    const melee = (b.use || 'melee') === 'melee';
    return `
    ${field('Name (optional)', bIn(b, 'label', '', 'e.g. Swing, Thrust'), 'Only needed with more than one attack.')}
    ${rollFields(data, b)}
    ${field('Damage', bIn(b, 'damage', '', 'e.g. 1d8+[Str_mod] cut'), 'Dice, sw / thr, or a number; formulas in [brackets]; then a type word.')}
    ${field('Delivery', bSel('use', opts(ABILITY_USES, b.use || 'melee', x => USE_LABEL[x])), 'Melee can be parried. Direct: no defense.')}
    ${field(melee ? 'Reach' : 'Range', `<input class="text_pole gs-bf" type="number" min="0" data-field="range" value="${esc(b.range || '')}" placeholder="${melee ? '1' : 'any'}">`, melee ? 'Empty = 1.' : 'In your rules\' unit.', 'gs-fnum')}
    ${field('Hits', bSel('hits', opts(['roll', 'auto'], b.hits || 'roll', x => (x === 'auto' ? 'always (no roll)' : 'roll'))), 'Always: no attack roll or defense.')}
    ${field('Effects', bIn(b, 'effects', '', 'e.g. fire-damage'), 'Rule effects of this attack only (your rules\' macros). Separate with ;', 'gs-ffull')}`;
}

function defenseBlock(data, b) {
    const armor = (b.kind || 'armor') === 'armor';
    return `
    ${field('Gives', bSel('kind', opts(['armor', 'block'], b.kind || 'armor', x => (x === 'armor' ? 'Armor' : 'A block roll'))), 'Armor: a value. Block: a defense roll.')}
    ${armor
        ? `${field('Armor value', bIn(b, 'value', 'type="number"', '0'), 'Counts toward armor (your rules\' "armor").', 'gs-fnum')}
           ${field('Slots covered', bIn(b, 'slots', 'list="gs-slots"', 'e.g. torso, arms'), 'Comma separated. Empty = everywhere (one armor value).', 'gs-fwide')}`
        : `${field('Skill', bSel('skill', skillOptions(data, b.skill)), 'Auto: a skill named like the item or its category.')}
           ${field('Bonus', bIn(b, 'value', 'type="number"', '0'), 'Added to the block roll.', 'gs-fnum')}`}`;
}

function modifierBlock(data, b) {
    const targets = modTargets(data.skills);
    const known = targets.includes(b.target);
    return `
    ${field('Amount', bIn(b, 'amount', 'type="number"', '+1'), 'Negative for a penalty.', 'gs-fnum')}
    ${field('Applies to', bSel('target', `${opts(targets, b.target, t => modTargetLabel(t, statLabel))}${known || !b.target ? '' : `<option selected value="${esc(b.target)}">${esc(b.target)}</option>`}`), 'Anything your rules or this sheet define.', 'gs-fwide')}
    ${field('Active when', bSel('when', opts(MOD_WHEN, b.when || 'equipped', x => ({ equipped: 'Equipped', carried: 'Carried', always: 'Always' })[x])), 'When the bonus counts.')}`;
}

function abilityBlock(data, b, e) {
    const fx = ABILITY_FX.includes(b.fx) ? b.fx : 'damage';
    const hasDice = DICE_FX.includes(fx);
    const hasMod = ['buff', 'debuff', 'haste'].includes(fx);
    const hasTurns = hasMod || ['stun', 'poison', 'bleed'].includes(fx);
    const pools = [...resourceNames().map(r => [r, r]), ...chargesOf(e).map(p => [`charges:${p.name}`, `${p.name} (this item)`])];
    const melee = b.use === 'melee';
    return `
    ${field('Name', bIn(b, 'name', '', 'e.g. Fireball'), 'Shows as “Name (item)” in rolls.', 'gs-fwide')}
    ${field('Kind', bIn(b, 'kind', 'list="gs-abkinds"', 'spell / power…'), 'Free text.')}
    ${rollFields(data, b)}
    ${field('Effect', bSel('fx', opts(ABILITY_FX, fx, x => FX_LABEL[x])), 'Picks which fields below apply.')}
    ${field('On', bSel('aim', `${opts(ABILITY_AIMS, b.aim, x => AIM_LABEL[x])}${b.aim ? '' : '<option value="" selected>auto</option>'}`), 'Who it can be used on.')}
    ${field('Delivery', bSel('use', opts(ABILITY_USES, b.use || 'ranged', x => USE_LABEL[x])), 'Ranged / melee can be defended.')}
    ${field(melee ? 'Reach' : 'Range', `<input class="text_pole gs-bf" type="number" min="0" data-field="range" value="${esc(b.range || '')}" placeholder="${melee ? '1' : 'any'}">`, 'In your rules\' unit.', 'gs-fnum')}
    ${field('Dice', bIn(b, 'damage', dis(hasDice), '2d / 1d+1'), 'Damage, healing or per-turn amount.')}
    ${field('Stat', bSel('stat', opts(ABILITY_STATS, b.stat, x => STAT_LABEL[x]), dis(['buff', 'debuff'].includes(fx))), 'Buff / debuff only.')}
    ${field('Mod', bIn(b, 'mod', `type="number" ${dis(hasMod)}`, '+2'), 'Buff / debuff / haste only.', 'gs-fnum')}
    ${field('Turns', bIn(b, 'duration', `type="number" min="1" ${dis(hasTurns)}`, '3'), 'Lasting effects only.', 'gs-fnum')}
    ${field('Resisted by', bSel('resist', opts(resistAttrs(), b.resist, x => x || '— (not resisted)')), 'Optional.')}
    ${field('DC', bIn(b, 'dc', dis(!!b.resist), '—'), 'Set: the target rolls against it.', 'gs-fnum')}
    ${field('On save', bSel('save', opts(SAVE_RESULTS, b.save, x => SAVE_LABEL[x]), dis(!!b.resist && String(b.dc ?? '') !== '')), 'Optional.')}
    ${field('Cast time', bIn(b, 'castTime', 'type="number" min="0"', '1'), 'Turns. 2+: goes off on the last turn.', 'gs-fnum')}
    ${field('Hits', bSel('hits', opts(['roll', 'auto'], b.hits || 'roll', x => (x === 'auto' ? 'always' : 'roll'))), 'Always: no roll, defense or resistance.')}
    ${field('Cost', bIn(b, 'cost', 'type="number" min="0"', '0'), 'Per use.', 'gs-fnum')}
    ${field('Paid from', bSel('resource', `<option value="">${pools.length ? '(first pool)' : '— nothing'}</option>${opts(pools.map(p => p[0]), b.resource, x => pools.find(p => p[0] === x)?.[1] || x)}`), 'Your rules\' pools, or this item\'s charges.')}
    ${field('Effects', bIn(b, 'effects', '', 'e.g. explosive 3; missile'), 'Rule effects of this ability (your rules\' macros). Separate with ;', 'gs-ffull')}
    ${field('Story notes', bIn(b, 'effect', '', 'How it looks, limits… (sent to the AI)'), 'For the AI only.', 'gs-ffull')}`;
}

const chargesBlock = (b) => `
    ${field('Name', bIn(b, 'name', '', 'Charges'), 'Item abilities pick it under “Paid from”.')}
    ${field('Left', bIn(b, 'left', 'type="number" min="0"', 'unlimited'), 'Counts down per use. Empty = unlimited.', 'gs-fnum')}
    ${field('Max', bIn(b, 'max', 'type="number" min="0"', '—'), 'Optional.', 'gs-fnum')}`;

function consumesBlock(data, b, e) {
    const pool = b.from === 'pool';
    const names = pool ? consumablePools() : ammoCandidates(data.equipment, e);
    const cur = pool ? b.pool : b.item;
    const known = !cur || names.includes(cur);
    return `
    ${field('Uses up', bSel('from', opts(['item', 'pool'], pool ? 'pool' : 'item', x => (x === 'pool' ? 'A resource pool' : 'An item'))), 'Ammo from the inventory, or FP / mana / health…')}
    ${field(pool ? 'Pool' : 'Item', bSel(pool ? 'pool' : 'item', `<option value="">—</option>${opts(names, cur)}${known ? '' : `<option selected>${esc(cur)}</option>`}`), pool ? 'Pools from your rules (resources, health, stamina).' : 'Another item in this inventory.', 'gs-fwide')}
    ${field('Per attack', bIn(b, 'per', 'type="number" min="0"', '1'), pool ? 'Spent from that pool on each attack.' : 'Subtracted from that item\'s qty.', 'gs-fnum')}`;
}

const BLOCK_BODY = { attack: attackBlock, defense: defenseBlock, modifier: modifierBlock, ability: abilityBlock, charges: (d, b) => chargesBlock(b), consumes: consumesBlock };

const blockHtml = (data, e) => (b, bi) => `
              <div class="gs-block gs-block-${b.type}" data-bi="${bi}">
                <div class="gs-bhead"><span>${BLOCK_LABEL[b.type]}</span><span class="gs-dim">${BLOCK_HINT[b.type]}</span><button class="menu_button gs-delblock" title="Remove this block">✕</button></div>
                <div class="gs-fields">${BLOCK_BODY[b.type](data, b, e)}</div>
              </div>`;

/** Roll buttons for an item: one per attack, one per item ability (when Roll Dice is installed). */
function itemButtons(data, e, i, acts) {
    if (!rollDice() || !String(e.name || '').trim()) return '';
    const name = String(e.name).trim();
    const out = [];
    for (const a of acts.filter(x => x.group === 'Attack' && x.item === name)) {
        out.push(`<button class="menu_button gs-attack" data-action="${esc(a.name)}" data-i="${i}" title="Combat roll: ${esc(a.name)}"><i class="fa-solid fa-hand-fist"></i> ${esc(a.name.replace(name, '').trim() || 'Attack')}</button>`);
    }
    for (const a of acts.filter(x => x.ability && x.item === name)) {
        out.push(`<button class="menu_button gs-ability-roll" data-name="${esc(a.name)}" data-i="${i}" title="Roll ${esc(a.name)}"><i class="fa-solid fa-wand-sparkles"></i> ${esc(a.name.replace(` (${name})`, ''))}${a.charges && a.charges.left !== null ? ` (${a.charges.left})` : ''}</button>`);
    }
    return out.join('');
}

/** One-line summary shown on a closed card. */
function summary(data, e) {
    const parts = [];
    const qty = Number(e.qty ?? 1);
    if (qty !== 1) parts.push(`×${qty}`);
    if (String(e.category || '').trim()) parts.push(esc(e.category));
    if (e.equipped === false) parts.push('not equipped');
    for (const b of itemBlocks(e)) {
        if (b.type === 'attack') parts.push(`${esc(b.damage || 'attack')} ${b.use === 'melee' ? 'melee' : esc(b.use || '')}`);
        if (b.type === 'defense') parts.push(b.kind === 'block' ? 'block' : `armor ${esc(b.value || 0)}${b.slots ? ` (${esc(b.slots)})` : ''}`);
        if (b.type === 'modifier' && Number(b.amount)) parts.push(`${Number(b.amount) > 0 ? '+' : ''}${esc(b.amount)} ${esc(modTargetLabel(b.target, statLabel))}`);
        if (b.type === 'ability' && b.name) parts.push(esc(b.name));
        if (b.type === 'charges') parts.push(`${esc(b.name || 'Charges')} ${String(b.left ?? '') === '' ? '∞' : esc(b.left)}`);
    }
    const ammo = ammoOf(data.equipment, e);
    for (const a of ammo) parts.push(`${esc(a.item)} ${a.left}${a.left < a.per ? ' — out of ammo' : ''}`);
    for (const b of itemBlocks(e).filter(x => x.type === 'consumes' && x.from === 'pool' && x.pool)) parts.push(`${esc(b.per ?? 1)} ${esc(b.pool)} per attack`);
    return parts.join(' · ');
}

const itemCard = (data, acts) => (e, i) => {
    const open = openItems.has(e);
    return `
              <div class="gs-card${open ? ' gs-open' : ''}" data-i="${i}">
                <div class="gs-chead">
                  <button class="menu_button gs-toggle" title="${open ? 'Collapse' : 'Expand'}">${open ? '▾' : '▸'}</button>
                  <b class="gs-cname">${esc(e.name || '(unnamed item)')}</b>
                  <span class="gs-dim gs-csum">${summary(data, e)}</span>
                  <span class="gs-itembtns">${itemButtons(data, e, i, acts)}<button class="menu_button gs-del" data-list="equipment" title="Remove item">✕</button></span>
                </div>
                ${open ? `
                <div class="gs-fields">
                  ${field('Name', `<input class="text_pole gs-f" data-list="equipment" data-field="name" value="${esc(e.name)}" placeholder="e.g. Longbow">`, 'What it is called in the story.', 'gs-fwide')}
                  ${field('Category', `<input class="text_pole gs-f" data-list="equipment" data-field="category" value="${esc(e.category)}" list="gs-cats">`, 'A label for sorting and the AI. Blocks decide what it does.')}
                  ${field('Qty', `<input class="text_pole gs-f" type="number" min="0" data-list="equipment" data-field="qty" value="${esc(e.qty ?? 1)}">`, 'How many you carry.', 'gs-fnum')}
                  ${field('Weight', `<input class="text_pole gs-f" type="number" min="0" step="0.1" data-list="equipment" data-field="weight" value="${esc(e.weight)}">`, 'Each. Counts toward encumbrance.', 'gs-fnum')}
                  ${field('Value', `<input class="text_pole gs-f" type="number" min="0" data-list="equipment" data-field="value" value="${esc(e.value)}">`, 'Each.', 'gs-fnum')}
                  ${field('Equipped', `<input type="checkbox" class="gs-equip" ${e.equipped === false ? '' : 'checked'}>`, 'Worn / in hand.', 'gs-fnum')}
                  ${field('Hands', `<select class="text_pole gs-f" data-list="equipment" data-field="hands">${[['', '1 (not set)'], ['1', '1'], ['2', '2']].map(([v, l]) => `<option value="${v}"${String(e.hands ?? '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`, 'How many hands it takes to hold (Equipment tab). Two-handed fills both hands.', 'gs-fnum')}
                  ${field('Effects', `<input class="text_pole gs-f" data-list="equipment" data-field="effects" value="${esc(e.effects ?? '')}" placeholder="e.g. fire-damage; immunity cold">`, 'Rule effects of the item (your rules\' macros): on every attack of it, and on whoever carries it. Separate with ;. The name never does anything.', 'gs-ffull')}
                  ${field('Story notes', `<input class="text_pole gs-f" data-list="equipment" data-field="effect" value="${esc(e.effect)}" placeholder="Looks, history… (sent to the AI)">`, 'For the AI only. Combat reads the blocks.', 'gs-ffull')}
                </div>
                ${(Array.isArray(e.blocks) ? e.blocks : []).map(blockHtml(data, e)).join('')}
                <div class="gs-addblocks"><span class="gs-dim">Add block:</span>${Object.keys(BLOCK_LABEL).map(t => `<button class="menu_button gs-addblock" data-type="${t}" title="${esc(BLOCK_HINT[t])}">+ ${BLOCK_LABEL[t]}</button>`).join('')}</div>` : ''}
              </div>`;
};

export const inventory = (data, c) => {
    const acts = combatActions(data);
    return `
          <section>
            <h5>Inventory <span class="gs-dim" data-calc="inv">${inventoryLabel(c)}</span></h5>
            ${data.equipment.map(itemCard(data, acts)).join('') || emptyRow('Empty.')}
            <datalist id="gs-cats">${CATEGORIES.map(x => `<option>${x}</option>`).join('')}</datalist>
            <datalist id="gs-slots">${SLOT_SUGGESTIONS.map(x => `<option>${x}</option>`).join('')}</datalist>
            ${rules().itemPresets.length ? `<div class="gs-addblocks"><span class="gs-dim">${esc(rules().name || 'Rules')} items:</span>${rules().itemPresets.map((p, k) => `<button class="menu_button gs-additem" data-rulepreset="${k}" title="Preset from your rules">+ ${esc(p.name)}</button>`).join('')}</div>` : ''}
            <div class="gs-addblocks"><span class="gs-dim">New item:</span>${Object.entries(ITEM_PRESETS).map(([k, p]) => `<button class="menu_button gs-additem" data-preset="${k}">+ ${p.label}</button>`).join('')}</div>
            <div class="gs-dim gs-encline" data-calc="encline">${encumbranceLine(c)}</div>
          </section>`;
};
