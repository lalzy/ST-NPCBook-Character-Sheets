import { secondaryList } from '../../../engine/index.js';
import { fmt } from '../../../utils/number.js';
import { stepper, rollBtn, emptyRow } from '../widgets.js';

const secRow = (data, c, x) =>
    `<div class="gs-tr gs-tr4"><span class="gs-lbl">${x.label} ${x.roll ? rollBtn(x.roll, c.values[x.key]) : ''}</span>${stepper('sec', x.key, fmt(c.values[x.key]), x.step || 1)}<span class="gs-base" data-calc="base-${x.key}">${fmt(c.bases[x.key])}</span></div>`;

export const secondary = (data, c) => `
              <h5>Secondary stats</h5>
              ${secondaryList().length ? `<div class="gs-table">
                <div class="gs-th"><span></span><span>Value</span><span>Base</span></div>
                ${secondaryList().map(x => secRow(data, c, x)).join('')}
              </div>` : emptyRow('None set up. Add them under Extensions → NPC Book Character Sheet → Rules.')}`;
