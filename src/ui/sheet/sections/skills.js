import { skillAttrs, skillsUsePoints, rules } from '../../../engine/index.js';
import { esc } from '../../../utils/html.js';
import { rollBtn, emptyRow } from '../widgets.js';

const options = (list, selected) => list.map(x => `<option ${x === selected ? 'selected' : ''}>${esc(x)}</option>`).join('');

// With a skillCosts table in the rules: points (and a difficulty, when the rules list them) set the level.
const pointsCells = (s, raw) => {
    if (!skillsUsePoints()) return '';
    const diffs = rules().skillDifficulties.map(d => d.name);
    return `
                <input class="text_pole gs-f gs-num" type="number" min="0" data-list="skills" data-field="points" value="${esc(raw?.points ?? '')}" title="Points spent (empty: type the level)">
                ${diffs.length ? `<select class="text_pole gs-f" data-list="skills" data-field="diff">${options(diffs, raw?.diff || diffs[0])}</select>` : ''}`;
};

const skillRow = (raw) => (s, i) => `
              <div class="gs-row gs-skill${skillsUsePoints() ? ` gs-skill-pts${rules().skillDifficulties.length ? ' gs-skill-diff' : ''}` : ''}" data-i="${i}">
                <input class="text_pole gs-f" data-list="skills" data-field="name" value="${esc(s.name)}" placeholder="Skill">
                <select class="text_pole gs-f" data-list="skills" data-field="attr">${options(skillAttrs(), s.attr)}</select>${pointsCells(s, raw[i])}
                <input class="text_pole gs-f gs-num" type="number" data-list="skills" data-field="level" value="${esc(s.fromPoints ? (s.level ?? '') : (raw[i]?.level ?? s.level ?? ''))}" title="${s.fromPoints ? 'Level from the points' : 'Level'}"${s.fromPoints ? ' disabled' : ''}>
                <span class="gs-level" data-calc="skill-${i}">${s.level !== null && String(s.name || '').trim() ? rollBtn(s.name, s.level) : ''}</span>
                <button class="menu_button gs-del" data-list="skills" title="Remove">✕</button>
              </div>`;

export const skills = (data, c) => `
          <section>
            <h5>Skills</h5>
            <div class="gs-row gs-skill${skillsUsePoints() ? ` gs-skill-pts${rules().skillDifficulties.length ? ' gs-skill-diff' : ''}` : ''} gs-hdr"><span>Name</span><span>Attr</span>${skillsUsePoints() ? `<span>Pts</span>${rules().skillDifficulties.length ? '<span>Diff</span>' : ''}` : ''}<span>Level</span><span></span><span></span></div>
            ${c.skills.map(skillRow(data.skills || [])).join('') || emptyRow('No skills.')}
            <button class="menu_button gs-add" data-list="skills">+ Skill</button>
          </section>`;
