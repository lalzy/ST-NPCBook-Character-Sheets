// Small reusable pieces of sheet markup.
import { esc } from '../../utils/html.js';
import { rollDice } from '../../integrations/rollDice/index.js';

export const stepper = (cls, key, val, step = 1) => `
        <div class="gs-stepper" data-cls="${cls}" data-key="${key}">
            <button class="menu_button gs-dec" title="-${step}">−</button>
            <input type="number" class="text_pole gs-${cls}" data-key="${key}" value="${esc(val)}" step="${step}">
            <button class="menu_button gs-inc" title="+${step}">+</button>
        </div>`;

/** Dice button for a roll against a target; empty when Roll Dice isn't installed. */
export const rollBtn = (name, target) => (rollDice() && target !== null && target !== undefined
    ? `<button class="menu_button gs-roll" data-name="${esc(name)}" data-target="${esc(target)}" title="Roll ${esc(name)} (vs ${esc(target)})"><i class="fa-solid fa-dice"></i></button>` : '');

export const emptyRow = (text) => `<div class="gs-empty">${text}</div>`;
