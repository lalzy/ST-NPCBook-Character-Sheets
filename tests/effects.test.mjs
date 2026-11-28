// Effects come only from a row's Effects field and the {{macros}} in its notes: never from its name. Names are made up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sheetMacros, effectsIn } from '../src/engine/macros.js';

const pick = (list) => list.map(m => `${m.row}:${m.from}:${m.name}${m.args.length ? ` ${m.args.join(',')}` : ''}`);

test('a name does nothing: "Sword of Attack", "Ring of Haste" with no effects give no macros', () => {
    const sh = { enabled: true, equipment: [{ name: 'Sword of Attack', qty: 1 }, { name: 'Ring of Haste', qty: 1, effect: 'A ring said to make you fast' }], traits: [{ name: 'Extra Attack' }], abilities: [{ name: 'Haste' }] };
    assert.deepEqual(sheetMacros(sh), []);
});

test('effects are optional: a spell with no effect is only its notes (Wish: narrated, nothing mechanical)', () => {
    const sh = { enabled: true, abilities: [{ name: 'Wish', effects: '', effect: 'The caster summons a genie who grants one wish.' }] };
    assert.deepEqual(sheetMacros(sh), []);
});

test('the Effects field and {{macros}} in notes count, scoped to their row', () => {
    const sh = {
        enabled: true,
        traits: [{ name: 'Snow-born', effects: 'immunity cold' }],
        equipment: [{
            name: 'Longsword', qty: 1, effects: 'flaming',
            blocks: [{ type: 'attack', label: 'Swing', effects: 'fire-damage 1d6' }, { type: 'ability', name: 'Flame Wave', effect: 'A wave of fire {{area 3}}' }],
        }],
        abilities: [{ name: 'Fireball', effects: 'fire; area: 5' }],
    };
    assert.deepEqual(pick(sheetMacros(sh)), [
        'trait:Snow-born:immunity cold',
        'item:Longsword:flaming',
        'attack:Longsword Swing:fire-damage 1d6',
        'ability:Flame Wave (Longsword):area 3',
        'ability:Fireball:fire',
        'ability:Fireball:area 5',
    ]);
});

test('effects field: "name a b", "name: one text", lines or ";"', () => {
    assert.deepEqual(effectsIn('resist fire, 0.5\nnote: hits twice; haste').map(m => [m.name, m.args]), [['resist', ['fire', '0.5']], ['note', ['hits twice']], ['haste', []]]);
});
