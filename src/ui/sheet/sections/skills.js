import { skillAttrs } from '../../../engine/index.js';
import { esc } from '../../../utils/html.js';
import { rollBtn, emptyRow } from '../widgets.js';

const options = (list, selected) => list.map(x => `<option ${x === selected ? 'selected' : ''}>${esc(x)}</option>`).join('');

const skillRow = (s, i) => `
              <div class="gs-row gs-skill" data-i="${i}">
                <input class="text_pole gs-f" data-list="skills" data-field="name" value="${esc(s.name)}" placeholder="Skill">
                <select class="text_pole gs-f" data-list="skills" data-field="attr">${options(skillAttrs(), s.attr)}</select>
                <input class="text_pole gs-f gs-num" type="number" data-list="skills" data-field="level" value="${esc(s.level ?? '')}" title="Level">
                <span class="gs-level" data-calc="skill-${i}">${s.level !== null && String(s.name || '').trim() ? rollBtn(s.name, s.level) : ''}</span>
                <button class="menu_button gs-del" data-list="skills" title="Remove">✕</button>
              </div>`;

export const skills = (data, c) => `
          <section>
            <h5>Skills</h5>
            <div class="gs-row gs-skill gs-hdr"><span>Name</span><span>Attr</span><span>Level</span><span></span><span></span></div>
            ${c.skills.map(skillRow).join('') || emptyRow('No skills.')}
            <button class="menu_button gs-add" data-list="skills">+ Skill</button>
          </section>`;
