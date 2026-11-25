import { esc } from '../../../utils/html.js';
export const notes = (data) => `
          <section>
            <h5>Notes <span class="gs-dim">(only you see these)</span></h5>
            <textarea class="text_pole gs-notes" rows="3">${esc(data.notes)}</textarea>
          </section>`;
