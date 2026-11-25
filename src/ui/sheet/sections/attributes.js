import { attrKeys, statLabel, rules, attrBase } from '../../../engine/index.js';
import { num, fmt } from '../../../utils/number.js';
import { stepper, rollBtn } from '../widgets.js';
import { esc } from '../../../utils/html.js';

export const attrCost = (data, k) => (num(data.attrs[k], attrBase()) - attrBase()) * (rules().attrCost[k] ?? 0);

const attrRow = (data, c, k) =>
    `<div class="gs-tr"><span class="gs-lbl">${esc(statLabel(k))} ${rollBtn(statLabel(k), c.attrs[k])}</span>${stepper('attr', k, data.attrs[k])}<span class="gs-cost" data-calc="attrcost-${k}">${attrCost(data, k)}</span></div>`;

const dash = (v) => (v === null || v === undefined ? '—' : v);

export const attributes = (data, c) => `
              <h5>Attributes</h5>
              <div class="gs-table">
                <div class="gs-th"><span></span><span>Value</span><span>Cost</span></div>
                ${attrKeys().map(k => attrRow(data, c, k)).join('') || '<div class="gs-dim">No attributes yet. Add them under "attributes" in the rules config.</div>'}
              </div>
              <h5>Derived</h5>
              <div class="gs-derived">
                <span>Lift <b data-calc="bl">${c.lift === null ? '—' : `${fmt(c.lift)} ${rules().liftUnit}`}</b></span>
                <span>Thrust <b data-calc="thr">${dash(c.thrust)}</b></span>
                <span>Swing <b data-calc="sw">${dash(c.swing)}</b></span>
                <span>Dodge <b data-calc="dodge">${dash(c.dodge)}</b> ${rollBtn('Dodge', c.dodge)}</span>
                <span>Move <b data-calc="move">${dash(c.move)}</b></span>
                <span>Encumbrance <b data-calc="enc">${c.encumbrance}</b></span>
              </div>`;
