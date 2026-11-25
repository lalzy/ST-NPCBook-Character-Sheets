// Computed-value labels shared by the first render and live refresh.
import { fmt } from '../../utils/number.js';
import { rules } from '../../engine/index.js';

const unit = () => (rules().liftUnit ? ` ${rules().liftUnit}` : '');

export const abilityLevelLabel = (a) => (a.level === null ? '—' : `${a.level} <small>(${a.via})</small>`);

export const inventoryLabel = (c) => `${fmt(c.carried)}${unit()} · value ${fmt(c.totalValue)}`;

export const encumbranceLine = (c) => (c.lift === null
    ? `Carried: ${fmt(c.carried)}${unit()}`
    : `Encumbrance: ${c.encumbrance} (${fmt(c.carried)}${unit()}, lift ${fmt(c.lift)}${unit()}) → Move ${c.move ?? '—'}, Dodge ${c.dodge ?? '—'}`);

