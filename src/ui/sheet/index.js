// Character sheet editor: renders into `host` and edits `data` (a mutable draft owned by NPC Book).
import { normalizeSheet, compute } from '../../engine/index.js';
import { sheetHtml, disabledSheet } from './sections/index.js';
import { refreshComputed } from './refresh.js';
import { bindSheetEvents } from './events.js';

export function renderSheet(host, data, who = { prefix: '', key: 'user' }) {
    // Fill in missing structure in place.
    const norm = normalizeSheet(data);
    for (const k of Object.keys(norm)) data[k] = norm[k];

    const draw = () => host.html(data.enabled ? sheetHtml(data, compute(data)) : disabledSheet(data));
    const refresh = () => refreshComputed(host, data);

    bindSheetEvents(host, data, who, { draw, refresh });
    draw();
}
