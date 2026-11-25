// Update computed values in place without re-rendering inputs (keeps focus while typing).
import { attrKeys, secondaryList, rules, compute } from '../../engine/index.js';
import { num, fmt } from '../../utils/number.js';
import { skillLevelLabel, abilityLevelLabel, inventoryLabel, encumbranceLine, pointSummary } from './labels.js';
import { attrCost } from './sections/attributes.js';

const dash = (v) => (v === null || v === undefined ? '—' : v);

export function refreshComputed(host, data) {
    const c = compute(data);
    const set = (k, html) => host.find(`[data-calc="${k}"]`).html(html);
    set('total', c.points.total);
    host.find('.gs-total').toggleClass('over', c.points.total > c.points.budget).toggleClass('ok', c.points.total <= c.points.budget);
    for (const k of attrKeys()) set(`attrcost-${k}`, attrCost(data, k));
    for (const x of secondaryList()) {
        set(`base-${x.key}`, fmt(c.bases[x.key]));
        set(`seccost-${x.key}`, num(data.sec[x.key]) * x.cost);
        const inp = host.find(`.gs-sec[data-key="${x.key}"]`);
        if (!inp.is(':focus')) inp.val(fmt(c.values[x.key]));
    }
    set('bl', c.lift === null ? '—' : `${fmt(c.lift)} ${rules().liftUnit}`); set('thr', dash(c.thrust)); set('sw', dash(c.swing));
    set('dodge', dash(c.dodge)); set('move', dash(c.move)); set('enc', c.encumbrance);
    set('advpts', c.points.advantages); set('dispts', c.points.disadvantages); set('skillpts', c.points.skills);
    c.skills.forEach((s, i) => set(`skill-${i}`, skillLevelLabel(s)));
    c.abilities.forEach((a, i) => set(`ability-${i}`, abilityLevelLabel(a)));
    set('abilitypts', c.points.abilities);
    set('inv', inventoryLabel(c));
    set('encline', encumbranceLine(c));
    set('summary', pointSummary(c));
}
