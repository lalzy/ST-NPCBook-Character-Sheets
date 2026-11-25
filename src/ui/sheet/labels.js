// Computed-value labels shared by the first render and live refresh.
import { fmt } from '../../utils/number.js';
import { rules } from '../../engine/index.js';

const unit = () => (rules().liftUnit ? ` ${rules().liftUnit}` : '');

export const skillLevelLabel = (s) => (s.level === null ? '—' : `${s.level} <small>(${s.rsl})</small>`);

export const abilityLevelLabel = (a) => (a.level === null ? '—' : `${a.level} <small>(${a.via})</small>`);

export const inventoryLabel = (c) => `${fmt(c.carried)}${unit()} · value ${fmt(c.totalValue)}`;

export const encumbranceLine = (c) => (c.lift === null
    ? `Carried: ${fmt(c.carried)}${unit()}`
    : `Encumbrance: ${c.encumbrance} (${fmt(c.carried)}${unit()}, lift ${fmt(c.lift)}${unit()}) → Move ${c.move ?? '—'}, Dodge ${c.dodge ?? '—'}`);

export const pointSummary = (c) => `Attributes ${c.points.attributes} · Secondary ${c.points.secondary} · Positive traits ${c.points.advantages} · Negative traits ${c.points.disadvantages} · Skills ${c.points.skills} · Abilities ${c.points.abilities} · <b>Total ${c.points.total} / ${c.points.budget}</b>`;
