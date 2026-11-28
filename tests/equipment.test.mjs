// What a character holds (the Equipment tab): primary hand / off-hand, hands per item. Names are made up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setRules, rules, normalizeSheet, heldOf, holdable, handLabels, setHeld, sheetFromLLM, itemHands } from '../src/engine/index.js';

const sheet = (held, extra = []) => normalizeSheet({ enabled: true, held, equipment: [
    { name: 'Shortsword', qty: 1, hands: 1 }, { name: 'Shield', qty: 1 }, { name: 'Dagger', qty: 1 }, { name: 'Greatbow', qty: 1, hands: 2 }, { name: 'Rope', qty: 0 }, ...extra] });

test('held: items in hand are checked against what is carried; two-handed fills both hands', () => {
    setRules({});
    assert.deepEqual(heldOf(sheet({ primary: 'shortsword', off: 'Shield' })), { primary: 'Shortsword', off: 'Shield', twoHanded: false });
    assert.deepEqual(heldOf(sheet({ primary: 'Greatbow', off: 'Shield' })), { primary: 'Greatbow', off: '', twoHanded: true });
    assert.equal(heldOf(sheet({ off: 'Greatbow' })).off, '', 'a two-handed item does not fit the off-hand');
    assert.equal(heldOf(sheet({ primary: 'Rope' })).primary, '', 'not carried (qty 0)');
    assert.equal(heldOf(sheet({ primary: 'Dagger', off: 'Dagger' })).off, '', 'one dagger cannot be in both hands');
    assert.equal(heldOf(sheet({ primary: 'Knife', off: 'Knife' }, [{ name: 'Knife', qty: 2 }])).off, 'Knife', 'a pair can');
    assert.equal(holdable(sheet({})).length, 4);
    assert.equal(itemHands({}), 1);
    const s = sheet({});
    setHeld(s, { primary: 'Greatbow', off: 'Dagger' });
    assert.deepEqual(s.held, { primary: 'Greatbow', off: '' });
});

test('hands: names from the rules, per handedness when there is one', () => {
    setRules({});
    assert.deepEqual(handLabels(sheet({})), { primary: 'Primary hand', off: 'Off-hand' });
    setRules({ hands: { primary: 'Main', off: 'Other', handedness: [{ name: 'Right-handed', primary: 'Right hand', off: 'Left hand' }, { name: 'Left-handed', primary: 'Left hand', off: 'Right hand' }] } });
    assert.deepEqual(handLabels(sheet({})), { primary: 'Right hand', off: 'Left hand' }, 'none set: the first');
    assert.deepEqual(handLabels({ ...sheet({}), handedness: 'left-handed' }), { primary: 'Left hand', off: 'Right hand' });
    assert.equal(rules().hands.handedness.length, 2);
    setRules({});
});

test('an LLM-made sheet says what is in hand and how many hands items take', () => {
    setRules({});
    const sh = sheetFromLLM({ equipment: [
        { name: 'Spear', category: 'weapon', damage: '1d6', hands: 2, held: 'primary' },
        { name: 'Buckler', category: 'shield', held: 'off' },
        { name: 'Knife', category: 'weapon', damage: '1d4' },
    ] });
    assert.equal(sh.equipment[0].hands, 2);
    assert.deepEqual(sh.held, { primary: 'Spear', off: '' }, 'the buckler does not fit next to a two-handed spear');
});
