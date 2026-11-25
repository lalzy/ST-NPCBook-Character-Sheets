import { skillAttrs, difficulties, skillsUsePoints } from '../../../engine/index.js';
import { esc } from '../../../utils/html.js';
import { rollBtn, emptyRow } from '../widgets.js';
import { skillLevelLabel } from '../labels.js';

const options = (list, selected) => list.map(x => `<option ${x === selected ? 'selected' : ''}>${esc(x)}</option>`).join('');

const skillRow = (s, i) => `
              <div class="gs-row gs-skill" data-i="${i}">
                <input class="text_pole gs-f" data-list="skills" data-field="name" value="${esc(s.name)}" placeholder="Skill">
                <select class="text_pole gs-f" data-list="skills" data-field="attr">${options(skillAttrs(), s.attr)}</select>
                ${difficulties().length ? `<select class="text_pole gs-f" data-list="skills" data-field="diff">${options(difficulties(), s.diff)}</select>` : '<span class="gs-dim">—</span>'}
                <input class="text_pole gs-f gs-pts" type="number" ${skillsUsePoints() ? 'min="0"' : ''} data-list="skills" data-field="pts" value="${esc(s.pts)}" title="${skillsUsePoints() ? 'Points spent' : 'Level above the attribute (no skill cost table in your rules)'}">
                <span class="gs-level"><span data-calc="skill-${i}">${skillLevelLabel(s)}</span> ${s.level !== null && String(s.name || '').trim() ? rollBtn(s.name, s.level) : ''}</span>
                <button class="menu_button gs-del" data-list="skills" title="Remove">✕</button>
              </div>`;

export const skills = (data, c) => `
          <section>
            <h5>Skills <span class="gs-dim" data-calc="skillpts">${c.points.skills}</span></h5>
            <div class="gs-row gs-skill gs-hdr"><span>Name</span><span>Attr</span><span>Diff</span><span>${skillsUsePoints() ? 'Pts' : '+Lvl'}</span><span>Level</span><span></span></div>
            ${c.skills.map(skillRow).join('') || emptyRow('No skills.')}
            <button class="menu_button gs-add" data-list="skills">+ Skill</button>
          </section>`;
