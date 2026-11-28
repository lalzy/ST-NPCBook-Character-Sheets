import { skillAttrs, ABILITY_KINDS, ABILITY_USES, ABILITY_FX, ABILITY_AIMS, ABILITY_STATS, DICE_FX, SAVE_RESULTS, resistAttrs, resourceNames } from '../../../engine/index.js';
import { esc } from '../../../utils/html.js';
import { rollDice } from '../../../integrations/rollDice/index.js';
import { emptyRow } from '../widgets.js';
import { abilityLevelLabel } from '../labels.js';

export const USE_LABEL = { ranged: 'Ranged (the target can defend)', melee: 'Melee (the target can defend)', utility: 'Direct (no defense)' };
export const FX_LABEL = { damage: 'Damage', heal: 'Heal', fp: 'Restore stamina', buff: 'Buff (bonus)', debuff: 'Debuff (penalty)', stun: 'Stun', disarm: 'Disarm', haste: 'Extra actions (haste)', poison: 'Poison (damage each turn)', bleed: 'Bleeding (damage each turn)', none: 'No automatic effect' };
export const SAVE_LABEL = { none: 'nothing happens', half: 'half damage' };
export const AIM_LABEL = { enemy: 'Enemy', ally: 'Ally (or self)', self: 'Self only', any: 'Anyone' };
export const STAT_LABEL = { attack: 'Attack rolls', defense: 'Defenses', skill: 'Skill rolls', resist: 'Resistance rolls', dr: 'DR', move: 'Move', all: 'All rolls' };

const options = (list, selected, label = (x) => x) => list.map(x => `<option value="${esc(x)}" ${x === selected ? 'selected' : ''}>${esc(label(x))}</option>`).join('');

/** A labelled cell; `off` dims and disables fields that don't apply to this ability's effect. */
const cell = (label, inner, cls = '') => `<label class="gs-abcell ${cls}"><span>${label}</span>${inner}</label>`;

/** Skill / attribute the ability is rolled against. Empty = a skill with the ability's own name. */
const skillSelect = (data, a) => {
    const skills = data.skills.map(s => String(s.name || '').trim()).filter(Boolean);
    const known = !a.skill || skillAttrs().includes(a.skill) || skills.includes(a.skill);
    return `
                <select class="text_pole gs-f" data-list="abilities" data-field="skill" title="Rolled against this skill or attribute. Auto: a skill with the ability's own name (a spell is a skill), else the untrained level from your rules.">
                  <option value="">(auto)</option>
                  <optgroup label="Attributes">${options(skillAttrs(), a.skill)}</optgroup>
                  ${skills.length ? `<optgroup label="Skills">${options(skills, a.skill)}</optgroup>` : ''}
                  ${known ? '' : `<option selected>${esc(a.skill)}</option>`}
                </select>`;
};

const rollAbilityBtn = (a) => (rollDice() && String(a.name || '').trim()
    ? `<button class="menu_button gs-ability-roll" data-name="${esc(a.name)}" title="Roll ${esc(a.name)}"><i class="fa-solid fa-wand-sparkles"></i></button>` : '');

const DICE_HINT = { damage: '2d / 1d+1 / 5', heal: '2d', fp: '1d', poison: '1d4', bleed: '1' };

const abilityRow = (data) => (a, i) => {
    const raw = data.abilities[i] || {};
    const hasDice = DICE_FX.includes(a.fx);
    const hasMod = ['buff', 'debuff', 'haste'].includes(a.fx);
    const hasStat = ['buff', 'debuff'].includes(a.fx);
    const hasTurns = hasMod || ['stun', 'poison', 'bleed'].includes(a.fx);
    const pools = resourceNames();
    const dis = (on) => (on ? '' : 'disabled');
    return `
              <div class="gs-ability" data-i="${i}">
                <div class="gs-abline">
                  ${cell('Name', `<input class="text_pole gs-f" data-list="abilities" data-field="name" value="${esc(a.name)}" placeholder="e.g. Spark">`, 'gs-abwide')}
                  ${cell('Kind', `<input class="text_pole gs-f" data-list="abilities" data-field="kind" value="${esc(a.kind)}" list="gs-abkinds" placeholder="spell / psionic…">`)}
                  ${cell('Rolled vs', skillSelect(data, a))}
                  ${cell('Level', `<span class="gs-level"><span data-calc="ability-${i}">${abilityLevelLabel(a)}</span></span>`)}
                  ${cell('Cost', `<input class="text_pole gs-f gs-num" type="number" min="0" data-list="abilities" data-field="cost" value="${esc(a.cost || '')}" placeholder="0" title="Cost per use">`, 'gs-abnum')}
                  ${pools.length > 1 ? cell('Paid from', `<select class="text_pole gs-f" data-list="abilities" data-field="resource">${options(pools, a.resource)}</select>`) : ''}
                  <span class="gs-itembtns">${rollAbilityBtn(a)}<button class="menu_button gs-del" data-list="abilities" title="Remove">✕</button></span>
                </div>
                <div class="gs-abline">
                  ${cell('Does', `<select class="text_pole gs-f" data-list="abilities" data-field="fx">${options(ABILITY_FX, a.fx, x => FX_LABEL[x])}</select>`)}
                  ${cell('On', `<select class="text_pole gs-f" data-list="abilities" data-field="aim">${options(ABILITY_AIMS, raw.aim ? a.aim : '', x => AIM_LABEL[x])}${raw.aim ? '' : `<option value="" selected>auto (${AIM_LABEL[a.aim]})</option>`}</select>`)}
                  ${cell('Delivery', `<select class="text_pole gs-f" data-list="abilities" data-field="use">${options(ABILITY_USES, a.use, x => USE_LABEL[x])}</select>`)}
                  ${cell(a.use === 'melee' ? 'Reach' : 'Range', `<input class="text_pole gs-f gs-num" type="number" min="0" data-list="abilities" data-field="range" value="${esc(a.range || '')}" placeholder="${a.use === 'melee' ? '1' : a.use === 'ranged' ? 'yd' : 'any'}" title="${a.use === 'melee' ? 'Reach (yd)' : 'Range (yd); empty = any distance for direct abilities'}">`, 'gs-abnum')}
                  ${cell(a.fx === 'damage' ? 'Damage' : a.fx === 'heal' ? 'Heals' : a.fx === 'fp' ? 'Restores' : ['poison', 'bleed'].includes(a.fx) ? 'Per turn' : 'Dice', `<input class="text_pole gs-f" data-list="abilities" data-field="damage" value="${esc(a.damage)}" placeholder="${DICE_HINT[a.fx] || '—'}" ${dis(hasDice)}>`)}
                  ${cell('Stat', `<select class="text_pole gs-f" data-list="abilities" data-field="stat" ${dis(hasStat)}>${options(ABILITY_STATS, a.stat, x => STAT_LABEL[x])}</select>`)}
                  ${cell(a.fx === 'haste' ? 'Extra' : 'Mod', `<input class="text_pole gs-f gs-num" type="number" data-list="abilities" data-field="mod" value="${esc(hasMod ? a.mod : '')}" placeholder="${a.fx === 'debuff' ? '-2' : a.fx === 'haste' ? '1' : '+2'}" ${dis(hasMod)} title="${a.fx === 'haste' ? 'Extra actions each turn' : 'Modifier'}">`, 'gs-abnum')}
                  ${cell('Turns', `<input class="text_pole gs-f gs-num" type="number" min="1" data-list="abilities" data-field="duration" value="${esc(hasTurns ? a.duration : '')}" placeholder="${a.fx === 'stun' ? '1' : '3'}" ${dis(hasTurns)}>`, 'gs-abnum')}
                  ${cell('Resisted by', `<select class="text_pole gs-f" data-list="abilities" data-field="resist">${options(resistAttrs(), a.resist, x => x || '— (not resisted)')}</select>`)}
                  ${cell('Defended by', `<input class="text_pole gs-f" data-list="abilities" data-field="defendWith" value="${esc(raw.defendWith || '')}" placeholder="any" ${dis(a.use !== 'utility')} title="Which defenses work against it, e.g. dodge, block. Empty: what your game system allows against ${a.use === 'melee' ? 'melee' : 'ranged'} attacks.">`)}
                  ${cell('Cast time', `<input class="text_pole gs-f gs-num" type="number" min="0" data-list="abilities" data-field="castTime" value="${esc(a.castTime > 0 ? a.castTime : '')}" placeholder="1" title="Turns it takes to cast. 1 or empty: it works the turn you use it. 2+: you concentrate, and it goes off on the last turn.">`, 'gs-abnum')}
                  ${cell('Hits', `<select class="text_pole gs-f" data-list="abilities" data-field="hits" title="Always: no attack roll, no defense, no resistance (it just works).">${options(['roll', 'auto'], a.hits, x => (x === 'auto' ? 'always' : 'roll'))}</select>`)}
                  ${cell('DC', `<input class="text_pole gs-f gs-num" data-list="abilities" data-field="dc" value="${esc(raw.dc ?? '')}" placeholder="—" ${dis(!!a.resist)} title="A number or formula. Set: the target rolls the resist stat against it and you don't roll. Empty: an opposed roll against your margin.">`, 'gs-abnum')}
                  ${cell('On save', `<select class="text_pole gs-f" data-list="abilities" data-field="save" ${dis(!!a.resist && a.dc !== null)}>${options(SAVE_RESULTS, a.save, x => SAVE_LABEL[x])}</select>`)}
                </div>
                <div class="gs-abline">
                  ${cell('Effects', `<input class="text_pole gs-f" data-list="abilities" data-field="effects" value="${esc(raw.effects ?? '')}" placeholder="Rule effects (your rules' macros), e.g. explosive 3; missile" title="Optional. What it does by rule, beside the Effect above. Separate with ;. Empty is fine: notes and the AI narrate the rest.">`, 'gs-abfull')}
                  ${cell('Notes', `<input class="text_pole gs-f" data-list="abilities" data-field="effect" value="${esc(a.effect)}" placeholder="What it does in the story, limits, special cases… (sent to the AI)">`, 'gs-abfull')}
                </div>
              </div>`;
};

export const abilities = (data, c) => `
          <section>
            <h5>Abilities <span class="gs-dim">spells, psionics, powers…</span></h5>
            ${c.abilities.map(abilityRow(data)).join('') || emptyRow('None. Abilities are spells, psionics, powers or natural attacks that are not inventory items. In Combat Mode they can damage, heal, restore stamina, buff, debuff, stun, disarm, grant extra actions, poison or cause bleeding, or just be rolled and narrated.')}
            <datalist id="gs-abkinds">${ABILITY_KINDS.map(x => `<option>${x}</option>`).join('')}</datalist>
            <button class="menu_button gs-add" data-list="abilities">+ Ability</button>
          </section>`;
