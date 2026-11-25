import { esc } from '../../../utils/html.js';
import { rules, rulesConfigured } from '../../../engine/index.js';

export const header = (data, c) => `
          <div class="gs-head">
            <b>${esc(rules().name || 'Character sheet')}</b>
            <label>TL <input type="number" class="text_pole gs-top" data-key="tl" value="${esc(data.tl)}"></label>
            <label>SM <input type="number" class="text_pole gs-top" data-key="sm" value="${esc(data.sm)}"></label>
            <span class="gs-spacer"></span>
            <span class="gs-total ${c.points.total > c.points.budget ? 'over' : 'ok'}">Points <b data-calc="total">${c.points.total}</b> /
              <input type="number" class="text_pole gs-top gs-budget" data-key="budget" value="${esc(data.budget)}"></span>
          </div>
          ${rulesConfigured() ? '' : '<div class="gs-dim gs-norules">No rules set up yet, so costs, derived stats and defenses are blank. Fill them in from your own rulebook under Extensions → NPC Book Character Sheet → Rules.</div>'}`;
