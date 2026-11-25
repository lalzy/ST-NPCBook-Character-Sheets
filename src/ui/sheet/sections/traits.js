import { esc } from '../../../utils/html.js';
import { num } from '../../../utils/number.js';
import { emptyRow } from '../widgets.js';

const traitRows = (list) => list.map(t => `
            <div class="gs-row gs-trait" data-i="${t.i}">
                <input class="text_pole gs-f" data-list="traits" data-field="name" value="${esc(t.name)}" placeholder="Name">
                <input class="text_pole gs-f gs-pts" type="number" data-list="traits" data-field="pts" value="${esc(t.pts)}" title="Points">
                <input class="text_pole gs-f gs-effect" data-list="traits" data-field="effect" value="${esc(t.effect || '')}" placeholder="Effect">
                <button class="menu_button gs-del" data-list="traits" title="Remove">✕</button>
            </div>`).join('') || emptyRow('—');

export const traits = (data, c) => {
    const indexed = data.traits.map((t, i) => ({ ...t, i }));
    const adv = indexed.filter(t => num(t.pts) >= 0);
    const dis = indexed.filter(t => num(t.pts) < 0);
    return `
          <div class="gs-grid2">
            <section>
              <h5>Positive traits <span class="gs-dim" data-calc="advpts">${c.points.advantages}</span></h5>
              ${traitRows(adv)}
              <button class="menu_button gs-add" data-list="traits" data-sign="1">+ Positive trait</button>
            </section>
            <section>
              <h5>Negative traits <span class="gs-dim" data-calc="dispts">${c.points.disadvantages}</span></h5>
              ${traitRows(dis)}
              <button class="menu_button gs-add" data-list="traits" data-sign="-1">+ Negative trait</button>
            </section>
          </div>`;
};
