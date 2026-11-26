// Delegated DOM event handlers for a rendered sheet.
import { combatActions, attrBase, spendUse, rules } from '../../engine/index.js';
import { num } from '../../utils/number.js';
import { rollFromSheet, rollablesFor } from '../../integrations/rollDice/index.js';
import { setSecFromValue, stepValue, setListField, addRow, removeRow, addGroup, rollHp, addItem, addBlock, removeBlock, setBlockField, convertItem } from './mutations.js';
import { openItems, ITEM_PRESETS } from './sections/inventory.js';

/** Edits that change which rows/options exist need a full redraw. */
const REDRAW_ON_CHANGE = 'select.gs-f, .gs-f[data-list="equipment"][data-field="name"], .gs-f[data-list="equipment"][data-field="qty"], select.gs-bf, .gs-bf[data-field="name"], .gs-bf[data-field="dc"], .gs-bf[data-field="left"], .gs-f[data-list="equipment"][data-field="category"], .gs-f[data-list="skills"][data-field="name"], .gs-f[data-list="skills"][data-field="points"], .gs-f[data-list="abilities"][data-field="name"]';

export function bindSheetEvents(host, data, who, { draw, refresh }) {
    const reactionOf = (el) => data.reactions[Number($(el).closest('.gs-reaction').data('i'))];

    host.off('.gs');

    // Rolls
    // An item's roll button also spends what the item uses: ammo for an attack, charges for an item ability.
    const itemBlockOf = (i, pick) => (Array.isArray(data.equipment[i]?.blocks) ? data.equipment[i].blocks.find(pick) : null);
    host.on('click.gs', '.gs-attack', (e) => {
        e.preventDefault();
        const el = $(e.currentTarget);
        const name = String(el.data('action') || `${el.data('name')} Attack`);
        const act = combatActions(data).find(a => a.name === name);
        if (!act) return;
        rollFromSheet(data, who.prefix, name, act.target, who.key, 'combat');
        const i = el.data('i');
        if (i !== undefined && act.ammo && spendUse(data, Number(i), { type: 'attack' })) draw();
    });
    host.on('click.gs', '.gs-ability-roll', (e) => {
        e.preventDefault();
        const el = $(e.currentTarget);
        const name = String(el.data('name'));
        const act = combatActions(data).find(a => a.ability && a.name === name);
        if (!act) return;
        rollFromSheet(data, who.prefix, name, act.target, who.key, act.attack ? 'combat' : 'skill');
        const i = el.data('i');
        if (i === undefined || !act.charges) return;
        const own = name.replace(/ \([^)]*\)$/, '');
        const b = itemBlockOf(Number(i), x => x.type === 'ability' && String(x.name || '').trim() === own);
        if (b && spendUse(data, Number(i), b)) draw();
    });
    host.on('click.gs', '.gs-roll', (e) => {
        e.preventDefault();
        // use live values (the sheet may have unsaved edits)
        const name = String($(e.currentTarget).data('name'));
        const live = rollablesFor(data).find(r => r.name === name);
        rollFromSheet(data, who.prefix, name, live ? live.target : $(e.currentTarget).data('target'), who.key);
    });

    // Top-level values
    host.on('change.gs', '.gs-enable-cb', (e) => { data.enabled = e.target.checked; draw(); });
    host.on('input.gs', '.gs-attr', (e) => { data.attrs[$(e.target).data('key')] = Math.round(num(e.target.value, attrBase())); refresh(); });
    host.on('change.gs', '.gs-sec', (e) => { setSecFromValue(data, $(e.target).data('key'), e.target.value); refresh(); });
    host.on('click.gs', '.gs-dec, .gs-inc', (e) => {
        const box = $(e.currentTarget).closest('.gs-stepper');
        const cls = box.data('cls');
        const dir = $(e.currentTarget).hasClass('gs-inc') ? 1 : -1;
        const v = stepValue(data, cls, box.data('key'), dir);
        if (cls === 'attr') box.find('input').val(v);
        refresh();
    });

    host.on('click.gs', '.gs-hproll', (e) => { e.preventDefault(); rollHp(data, !!$(e.currentTarget).data('all')); draw(); });

    // List rows
    host.on('input.gs', '.gs-f', (e) => {
        const el = $(e.target);
        setListField(data, el.data('list'), Number(el.closest('[data-i]').data('i')), el.data('field'), e.target.value);
        refresh();
    });
    host.on('change.gs', REDRAW_ON_CHANGE, () => draw());
    host.on('click.gs', '.gs-add', (e) => {
        const list = $(e.currentTarget).data('list');
        addRow(data, list, Number($(e.currentTarget).data('sign')));
        draw();
        host.find(`[data-list="${list}"][data-field="name"]`).last().trigger('focus');
    });
    // Item cards and their blocks
    const itemIndex = (el) => Number($(el).closest('.gs-card').data('i'));
    host.on('click.gs', '.gs-additem', (e) => {
        const el = $(e.currentTarget);
        const rp = el.data('rulepreset');
        const it = addItem(data, rp !== undefined ? rules().itemPresets[Number(rp)] : ITEM_PRESETS[el.data('preset')]);
        openItems.add(it);
        draw();
        host.find('.gs-card').last().find('[data-field="name"]').first().trigger('focus');
    });
    host.on('click.gs', '.gs-toggle', (e) => {
        const it = data.equipment[itemIndex(e.currentTarget)];
        if (openItems.has(it)) openItems.delete(it); else openItems.add(it);
        draw();
    });
    host.on('change.gs', '.gs-equip', (e) => { data.equipment[itemIndex(e.currentTarget)].equipped = e.target.checked; draw(); });
    host.on('click.gs', '.gs-addblock', (e) => { addBlock(data, itemIndex(e.currentTarget), $(e.currentTarget).data('type')); draw(); });
    host.on('click.gs', '.gs-delblock', (e) => { removeBlock(data, itemIndex(e.currentTarget), Number($(e.currentTarget).closest('.gs-block').data('bi'))); draw(); });
    host.on('click.gs', '.gs-convert', (e) => { convertItem(data, itemIndex(e.currentTarget)); draw(); });
    host.on('input.gs', '.gs-bf', (e) => {
        const el = $(e.target);
        setBlockField(data, itemIndex(el), Number(el.closest('.gs-block').data('bi')), el.data('field'), e.target.value);
        refresh();
    });

    host.on('click.gs', '.gs-del', (e) => {
        const row = $(e.currentTarget).closest('[data-i]');
        removeRow(data, $(e.currentTarget).data('list'), Number(row.data('i')));
        draw();
    });

    // Reaction groups
    host.on('input.gs', '.gs-g', (e) => {
        const el = $(e.target);
        const g = reactionOf(el).groups[Number(el.closest('.gs-group').data('gi'))];
        g[el.data('field')] = el.data('field') === 'mod' ? num(e.target.value) : e.target.value;
    });
    host.on('click.gs', '.gs-addgroup', (e) => { addGroup(reactionOf(e.currentTarget)); draw(); });
    host.on('click.gs', '.gs-delgroup', (e) => {
        reactionOf(e.currentTarget).groups.splice(Number($(e.currentTarget).closest('.gs-group').data('gi')), 1);
        draw();
    });

    host.on('input.gs', '.gs-notes', (e) => { data.notes = e.target.value; });
}
