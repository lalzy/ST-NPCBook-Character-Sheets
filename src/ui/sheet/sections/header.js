import { rules, rulesConfigured } from '../../../engine/index.js';
import { esc } from '../../../utils/html.js';

export const header = () => `
          <div class="gs-head">
            <b>${esc(rules().name || 'Character sheet')}</b>
          </div>
          ${rulesConfigured() ? '' : '<div class="gs-dim gs-norules">No rules set up yet, so derived stats and defenses are blank. Fill them in from your own rulebook under Extensions → NPC Book Character Sheet → Rules.</div>'}`;
