import { isBlankSheet, normalizeSheet } from '../../../engine/index.js';

export const enableToggle = (data) => `
          <label class="gs-enable checkbox_label ${data.enabled ? 'on' : ''}">
            <input type="checkbox" class="gs-enable-cb" ${data.enabled ? 'checked' : ''}>
            <b>Enable sheet</b> <span class="gs-dim">for this character — when off, the sheet is not sent and is ignored</span>
          </label>`;

/** Whole sheet when the sheet is switched off for this character. */
export const disabledSheet = (data) =>
    `<div class="gs-sheet">${enableToggle(data)}<div class="gs-disabled">The sheet is off for this character.${isBlankSheet(normalizeSheet(data)) ? '' : ' Its data is kept and comes back when you enable it.'}</div></div>`;
