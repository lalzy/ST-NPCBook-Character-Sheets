// Everything on a sheet that can be rolled against.
import { attrKeys, statLabel, compute, secondaryList } from '../../engine/index.js';

export function rollablesFor(sheet) {
    const c = compute(sheet);
    const out = [];
    for (const k of attrKeys()) out.push({ group: 'Attributes', name: statLabel(k), target: c.attrs[k] });
    for (const x of secondaryList().filter(s => s.roll)) out.push({ group: 'Checks', name: x.roll, target: c.values[x.key] });
    if (c.dodge !== null) out.push({ group: 'Defense', name: 'Dodge', target: c.dodge });
    for (const s of [...c.skills].filter(x => String(x.name || '').trim() && x.level !== null).sort((a, b) => a.name.localeCompare(b.name))) {
        out.push({ group: 'Skills', name: s.name, target: s.level });
    }
    for (const a of c.abilities.filter(x => String(x.name || '').trim() && x.level !== null)) {
        out.push({ group: 'Abilities', name: a.name, target: a.level });
    }
    for (const a of (c.itemAbilities || []).filter(x => x.level !== null && !x.empty)) {
        out.push({ group: 'Abilities', name: `${a.name} (${a.item})`, target: a.level });
    }
    return out;
}
