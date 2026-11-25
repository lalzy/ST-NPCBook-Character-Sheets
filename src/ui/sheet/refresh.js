// Update computed values in place without re-rendering inputs (keeps focus while typing).
import { secondaryList, rules, compute } from '../../engine/index.js';
import { fmt } from '../../utils/number.js';
import { abilityLevelLabel, inventoryLabel, encumbranceLine } from './labels.js';
import { rollBtn } from './widgets.js';

const dash = (v) => (v === null || v === undefined ? '—' : v);

export function refreshComputed(host, data) {
    const c = compute(data);
    const set = (k, html) => host.find(`[data-calc="${k}"]`).html(html);
    for (const x of secondaryList()) {
        set(`base-${x.key}`, fmt(c.bases[x.key]));
        const inp = host.find(`.gs-sec[data-key="${x.key}"]`);
        if (!inp.is(':focus')) inp.val(fmt(c.values[x.key]));
    }
    set('bl', c.lift === null ? '—' : `${fmt(c.lift)} ${rules().liftUnit}`); set('thr', dash(c.thrust)); set('sw', dash(c.swing));
    set('dodge', dash(c.dodge)); set('ac', dash(c.ac)); set('move', dash(c.move)); set('enc', c.encumbrance);
    c.skills.forEach((s, i) => set(`skill-${i}`, s.level !== null && String(s.name || '').trim() ? rollBtn(s.name, s.level) : ''));
    c.abilities.forEach((a, i) => set(`ability-${i}`, abilityLevelLabel(a)));
    set('inv', inventoryLabel(c));
    set('encline', encumbranceLine(c));
}
