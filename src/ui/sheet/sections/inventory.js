import { CATEGORIES } from '../../../core/constants.js';
import { esc } from '../../../utils/html.js';
import { rollDice } from '../../../integrations/rollDice/index.js';
import { emptyRow } from '../widgets.js';
import { inventoryLabel, encumbranceLine } from '../labels.js';

const skillSelect = (data, e) => `
                <select class="text_pole gs-f" data-list="equipment" data-field="skill" title="Skill used to attack / parry / block with this item">
                  <option value="">—</option>${data.skills.filter(sk => String(sk.name || '').trim()).map(sk => `<option ${sk.name === e.skill ? 'selected' : ''}>${esc(sk.name)}</option>`).join('')}
                  ${e.skill && !data.skills.some(sk => sk.name === e.skill) ? `<option selected>${esc(e.skill)}</option>` : ''}
                </select>`;

const attackBtn = (e) => (rollDice() && /weapon|shield|ranged|melee/i.test(String(e.category || '')) && String(e.name || '').trim()
    ? `<button class="menu_button gs-attack" data-name="${esc(e.name)}" title="Combat roll with ${esc(e.name)}"><i class="fa-solid fa-hand-fist"></i></button>` : '');

const itemRow = (data) => (e, i) => `
              <div class="gs-row gs-item" data-i="${i}">
                <input class="text_pole gs-f" data-list="equipment" data-field="name" value="${esc(e.name)}" placeholder="Item">
                <input class="text_pole gs-f gs-pts" type="number" min="0" data-list="equipment" data-field="qty" value="${esc(e.qty ?? 1)}">
                <input class="text_pole gs-f" data-list="equipment" data-field="category" value="${esc(e.category)}" list="gs-cats">
                <input class="text_pole gs-f" data-list="equipment" data-field="stat" value="${esc(e.stat)}" placeholder="1d+1 / DR 2">${skillSelect(data, e)}
                <input class="text_pole gs-f gs-pts" type="number" min="0" step="0.1" data-list="equipment" data-field="weight" value="${esc(e.weight)}">
                <input class="text_pole gs-f gs-pts" type="number" min="0" data-list="equipment" data-field="value" value="${esc(e.value)}">
                <input class="text_pole gs-f" data-list="equipment" data-field="effect" value="${esc(e.effect)}">
                <span class="gs-itembtns">${attackBtn(e)}<button class="menu_button gs-del" data-list="equipment" title="Remove">✕</button></span>
              </div>`;

export const inventory = (data, c) => `
          <section>
            <h5>Inventory <span class="gs-dim" data-calc="inv">${inventoryLabel(c)}</span></h5>
            <div class="gs-row gs-item gs-hdr"><span>Name</span><span>Qty</span><span>Category</span><span>Stat</span><span>Skill</span><span>Weight</span><span>Value</span><span>Effect</span><span></span></div>
            ${data.equipment.map(itemRow(data)).join('') || emptyRow('Empty.')}
            <datalist id="gs-cats">${CATEGORIES.map(x => `<option>${x}</option>`).join('')}</datalist>
            <button class="menu_button gs-add" data-list="equipment">+ Item</button>
            <div class="gs-dim gs-encline" data-calc="encline">${encumbranceLine(c)}</div>
          </section>`;
