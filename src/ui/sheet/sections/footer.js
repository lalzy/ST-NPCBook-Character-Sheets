import { esc } from '../../../utils/html.js';
import { pointSummary } from '../labels.js';

export const summary = (c) => `
          <section>
            <h5>Point summary</h5>
            <div class="gs-dim" data-calc="summary">${pointSummary(c)}</div>
          </section>`;

export const notes = (data) => `
          <section>
            <h5>Notes <span class="gs-dim">(only you see these)</span></h5>
            <textarea class="text_pole gs-notes" rows="3">${esc(data.notes)}</textarea>
          </section>`;
