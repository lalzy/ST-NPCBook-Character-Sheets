// Assembles the full sheet markup from its sections.
import { enableToggle, disabledSheet } from './toggle.js';
import { header } from './header.js';
import { attributes } from './attributes.js';
import { secondary } from './secondary.js';
import { traits } from './traits.js';
import { skills } from './skills.js';
import { abilities } from './abilities.js';
import { reactions } from './reactions.js';
import { inventory } from './inventory.js';
import { summary, notes } from './footer.js';

export { disabledSheet };

export const sheetHtml = (data, c) => `
        <div class="gs-sheet">
          ${enableToggle(data)}
          ${header(data, c)}

          <div class="gs-grid2">
            <section>${attributes(data, c)}
            </section>
            <section>${secondary(data, c)}
            </section>
          </div>
          ${traits(data, c)}
          ${skills(data, c)}
          ${abilities(data, c)}
          ${reactions(data)}
          ${inventory(data, c)}
          ${summary(c)}
          ${notes(data)}
        </div>`;
