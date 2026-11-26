import { secondaryList, rules, statLabel } from '../../../engine/index.js';
import { fmt } from '../../../utils/number.js';
import { stepper, rollBtn, emptyRow } from '../widgets.js';

const secRow = (data, c, x) =>
    `<div class="gs-tr gs-tr4"><span class="gs-lbl">${x.label} ${x.roll ? rollBtn(x.roll, c.values[x.key]) : ''}</span>${stepper('sec', x.key, fmt(c.values[x.key]), x.step || 1)}<span class="gs-base" data-calc="base-${x.key}">${fmt(c.bases[x.key])}</span></div>`;

/** HP gained by dice (rules hpRoll): the rolls so far, and buttons to roll the missing ones or all again. */
export const hpRollLine = (c) => {
    const h = c.hpRoll;
    if (!h || !h.count) return '';
    const R = rules().hpRoll;
    const shown = h.rolls.map(x => (x === null ? '<span class="gs-dim">avg</span>' : x)).join(' + ');
    return `<div class="gs-hprolls gs-dim">HP dice (${R.dice} per ${statLabel(R.per)}${R.first === 'max' ? ', first at max' : ''}): ${shown} = <b>${h.total}</b>
      <button class="menu_button gs-hproll" ${h.missing ? '' : 'disabled'} title="Roll the dice not rolled yet">Roll missing</button>
      <button class="menu_button gs-hproll" data-all="1" title="Roll every level again">Re-roll all</button></div>`;
};

export const secondary = (data, c) => `
              <h5>Secondary stats</h5>
              ${secondaryList().length ? `<div class="gs-table">
                <div class="gs-th"><span></span><span>Value</span><span>Base</span></div>
                ${secondaryList().map(x => secRow(data, c, x)).join('')}
              </div><div data-calc="hprolls">${hpRollLine(c)}</div>` : emptyRow('None set up. Add them under Extensions → NPC Book - Character Sheet → Rules.')}`;
