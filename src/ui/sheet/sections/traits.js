import { esc } from '../../../utils/html.js';
import { emptyRow } from '../widgets.js';

const traitRow = (t, i) => `
            <div class="gs-row gs-trait" data-i="${i}">
                <input class="text_pole gs-f" data-list="traits" data-field="name" value="${esc(t.name)}" placeholder="Name">
                <input class="text_pole gs-f gs-effect" data-list="traits" data-field="effect" value="${esc(t.effect || '')}" placeholder="Notes">
                <input class="text_pole gs-f gs-effect" data-list="traits" data-field="effects" value="${esc(t.effects ?? '')}" placeholder="Effects (rules), e.g. haste; immunity cold" title="Rule effects (your rules' macros). Separate with ;. The name never does anything.">
                <button class="menu_button gs-del" data-list="traits" title="Remove">✕</button>
            </div>`;

export const traits = (data) => `
          <section>
            <h5>Traits</h5>
            ${data.traits.map(traitRow).join('') || emptyRow('—')}
            <button class="menu_button gs-add" data-list="traits">+ Trait</button>
          </section>`;
