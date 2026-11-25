// Delegated DOM event handlers for a rendered sheet.
import { combatActions, attrBase } from '../../engine/index.js';
import { num } from '../../utils/number.js';
import { rollFromSheet, rollablesFor } from '../../integrations/rollDice/index.js';
import { setSecFromValue, stepValue, setListField, addRow, removeRow, addGroup } from './mutations.js';

/** Edits that change which rows/options exist need a full redraw. */
const REDRAW_ON_CHANGE = '.gs-f[data-list="traits"][data-field="pts"], select.gs-f, .gs-f[data-list="equipment"][data-field="category"], .gs-f[data-list="skills"][data-field="name"], .gs-f[data-list="abilities"][data-field="name"]';

export function bindSheetEvents(host, data, who, { draw, refresh }) {
    const reactionOf = (el) => data.reactions[Number($(el).closest('.gs-reaction').data('i'))];

    host.off('.gs');

    // Rolls
    host.on('click.gs', '.gs-attack', (e) => {
        e.preventDefault();
        const name = `${$(e.currentTarget).data('name')} Attack`;
        const act = combatActions(data).find(a => a.name === name);
        if (act) rollFromSheet(data, who.prefix, name, act.target, who.key, 'combat');
    });
    host.on('click.gs', '.gs-ability-roll', (e) => {
        e.preventDefault();
        const name = String($(e.currentTarget).data('name'));
        const act = combatActions(data).find(a => a.ability && a.name === name);
        if (act) rollFromSheet(data, who.prefix, name, act.target, who.key, act.attack ? 'combat' : 'skill');
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
    host.on('input.gs', '.gs-top', (e) => { data[$(e.target).data('key')] = num(e.target.value); refresh(); });
    host.on('click.gs', '.gs-dec, .gs-inc', (e) => {
        const box = $(e.currentTarget).closest('.gs-stepper');
        const cls = box.data('cls');
        const dir = $(e.currentTarget).hasClass('gs-inc') ? 1 : -1;
        const v = stepValue(data, cls, box.data('key'), dir);
        if (cls === 'attr') box.find('input').val(v);
        refresh();
    });

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
