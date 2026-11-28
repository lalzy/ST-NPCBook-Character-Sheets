// The Equipment tab on a character's scene card (NPC Book sceneTabs): what it holds in its primary hand and off-hand.
// Separate from NPC Book's Outfit (what it wears) and from the sheet's Inventory (what it carries).
import { rules, normalizeSheet, holdable, heldOf, handLabels, handednessOf, setHeld, twoOf } from '../../engine/index.js';
import { esc } from '../../utils/html.js';

const opt = (v, label, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;

/** Draw the tab into `host` (jQuery) for the sheet draft `data` (changed in place; NPC Book saves it with Save). */
export function renderEquipment(host, data) {
    const draw = () => {
        const sh = normalizeSheet(data);
        if (!sh.enabled) { host.html('<div class="gs-dim">This character has no character sheet switched on, so there is nothing to hold.</div>'); return; }
        const items = holdable(sh);
        const h = heldOf(sh);
        const L = handLabels(sh);
        const hd = rules().hands.handedness;
        // an item in one hand isn't offered for the other (unless it is carried twice); a two-handed item is in both
        const free = (other) => (x) => !other || x.name !== other || twoOf(sh, x.name);
        const label = (x) => `${x.name}${x.hands === 2 ? ' (both hands)' : ''}`;
        const both = h.twoHanded ? h.primary : '';
        const forPrimary = items.filter(free(h.twoHanded ? '' : h.off));
        const forOff = items.filter(x => x.hands === 2 ? true : free(h.twoHanded ? '' : h.primary)(x));
        host.html(`
          <div class="gs-equipment">
            ${hd.length ? `<label class="gs-eq-row">Handedness<select class="text_pole gs-eq" data-k="handedness">${hd.map(x => opt(x.name, x.name, handednessOf(sh)?.name)).join('')}</select></label>` : ''}
            <label class="gs-eq-row">${esc(L.primary)}<select class="text_pole gs-eq" data-k="primary">${opt('', '(empty)', h.primary)}${forPrimary.map(x => opt(x.name, label(x), h.primary)).join('')}</select></label>
            <label class="gs-eq-row">${esc(L.off)}<select class="text_pole gs-eq" data-k="off">${opt('', '(empty)', both || h.off)}${forOff.map(x => opt(x.name, label(x), both || h.off)).join('')}</select></label>
            ${both ? `<div class="gs-small">${esc(both)} is held in both hands.</div>` : ''}
            <div class="gs-dim gs-small">${items.length ? 'A two-handed item takes both hands. Combat Mode starts a fight with these in hand; anything else has to be readied first.' : 'Nothing carried: add items to the Inventory on the sheet.'}</div>
          </div>`);
    };
    host.off('.gseq').on('change.gseq', '.gs-eq', (e) => {
        const k = e.target.dataset.k;
        if (k === 'handedness') data.handedness = e.target.value;
        else {
            const sh = normalizeSheet(data);
            const cur = heldOf(sh);
            const v = e.target.value;
            const two = holdable(sh).find(x => x.name === v)?.hands === 2;
            // a two-handed item picked in either hand takes both; a one-handed one in the off-hand frees the primary
            if (two) setHeld(data, { primary: v, off: '' });
            else if (k === 'off' && cur.twoHanded) setHeld(data, { primary: '', off: v });
            else if (k === 'primary' && cur.twoHanded) setHeld(data, { primary: v, off: '' });
            else setHeld(data, { ...cur, [k]: v });
        }
        draw();
    });
    draw();
}
