import { esc } from '../../../utils/html.js';
import { emptyRow } from '../widgets.js';

const WHO = ['everyone', 'attracted', 'others', 'same race', 'other races', 'authorities'];

const groupChip = (g, gi) => `
                  <span class="gs-group" data-gi="${gi}">
                    <input class="text_pole gs-g" data-field="who" value="${esc(g.who)}" placeholder="everyone / attracted / others…" list="gs-who">
                    <input class="text_pole gs-g gs-num" type="number" data-field="mod" value="${esc(g.mod)}">
                    <button class="menu_button gs-delgroup" title="Remove group">✕</button>
                  </span>`;

const reactionRow = (r, i) => `
              <div class="gs-reaction" data-i="${i}">
                <div class="gs-row">
                  <input class="text_pole gs-f" data-list="reactions" data-field="name" value="${esc(r.name)}" placeholder="Source, e.g. Friendly face">
                  <button class="menu_button gs-addgroup" title="Add group">+ group</button>
                  <button class="menu_button gs-del" data-list="reactions" title="Remove">✕</button>
                </div>
                <div class="gs-groups">${(r.groups || []).map(groupChip).join('')}</div>
              </div>`;

export const reactions = (data) => `
          <section>
            <h5>Reaction modifiers</h5>
            ${data.reactions.map(reactionRow).join('') || emptyRow('None.')}
            <datalist id="gs-who">${WHO.map(x => `<option>${x}</option>`).join('')}</datalist>
            <button class="menu_button gs-add" data-list="reactions">+ Reaction modifier</button>
          </section>`;
