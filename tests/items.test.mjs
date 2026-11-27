// Items built from blocks: attacks, ammo, armor slots, modifiers, item abilities with charges, and the XML they send.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setRules, compute, combatActions, toXml, armorList, totalDR, spendUse, normalizeSheet, itemFromText, sheetFromLLM } from '../src/engine/index.js';

const RULES = {
    attributes: [{ key: 'Dex', label: 'Dexterity' }, { key: 'Mind', label: 'Mind' }], attrBase: 10, roles: { defaultAttr: 'Dex' },
    parry: 'floor(skill / 2) + 3', block: 'floor(skill / 2) + 3', dodge: '8', armorClass: '10 + armor', unskilled: 'Dex - 5',
};
const find = (acts, name) => acts.find(a => a.name === name);

const sheet = () => ({
    enabled: true, attrs: { Dex: 12 }, skills: [{ name: 'Bow', attr: 'Dex', level: 13 }, { name: 'Staff', attr: 'Dex', level: 12 }],
    equipment: [
        { name: 'Longbow +3', qty: 1, category: 'whatever', blocks: [
            { type: 'attack', roll: 'skill', skill: 'Bow', damage: '1d8', use: 'ranged', range: 150 },
            { type: 'modifier', amount: 3, target: 'item:both', when: 'equipped' },
            { type: 'consumes', item: 'Arrows', per: 1 },
        ] },
        { name: 'Arrows', qty: 2, category: 'ammo', blocks: [] },
        { name: 'Quarterstaff', qty: 1, blocks: [{ type: 'attack', label: 'Swing', skill: 'Staff', damage: '1d6', use: 'melee', range: 2 }, { type: 'attack', label: 'Thrust', skill: 'Staff', damage: '1d4', use: 'melee' }] },
        { name: 'Breastplate', qty: 1, blocks: [{ type: 'defense', kind: 'armor', value: 4, slots: 'torso' }] },
        { name: 'Greaves', qty: 1, blocks: [{ type: 'defense', kind: 'armor', value: 2, slots: 'legs' }] },
        { name: 'Spare helm', qty: 1, equipped: false, blocks: [{ type: 'defense', kind: 'armor', value: 3, slots: 'head' }] },
        { name: 'Oak Wand', qty: 1, category: 'wand', blocks: [
            { type: 'ability', name: 'Fireball', roll: 'fixed', level: '15', fx: 'damage', use: 'utility', damage: '8d6', range: 150, cost: 1, resource: 'charges:Charges' },
            { type: 'charges', name: 'Charges', left: 1, max: 7 },
        ] },
        { name: 'Ring of Mind', qty: 1, blocks: [{ type: 'modifier', amount: 2, target: 'attr:Mind', when: 'equipped' }, { type: 'modifier', amount: 1, target: 'dodge', when: 'carried' }] },
    ],
});

test('any item with an Attack block is a weapon, whatever its category; modifiers and ammo apply', () => {
    setRules(RULES);
    const acts = combatActions(sheet());
    const atk = find(acts, 'Longbow +3 Attack');
    assert.equal(atk.target, 13 + 3);
    assert.equal(atk.range, 150);
    assert.equal(atk.ranged, true);
    assert.deepEqual(atk.ammo, [{ item: 'Arrows', per: 1, left: 2 }]);
    assert.equal(find(acts, 'Longbow +3 Damage').add, 3);
    assert.equal(find(acts, 'Parry (Longbow +3)'), undefined, 'ranged: no parry');
    assert.equal(find(acts, 'Quarterstaff Swing').reach, 2);
    assert.equal(find(acts, 'Quarterstaff Thrust').reach, 1, 'melee reach defaults to 1');
    assert.equal(find(acts, 'Parry (Quarterstaff)').target, 6 + 3);
    assert.equal(find(acts, 'Dodge').target, 8 + 1);
});

test('out of ammo: the attack is left out; spendUse subtracts ammo and charges', () => {
    setRules(RULES);
    const sh = normalizeSheet(sheet());
    assert.ok(spendUse(sh, 0, sh.equipment[0].blocks[0]));
    assert.equal(sh.equipment[1].qty, 1);
    spendUse(sh, 0, sh.equipment[0].blocks[0]);
    assert.equal(find(combatActions(sh), 'Longbow +3 Attack'), undefined);
    assert.ok(find(combatActions(sh), 'Fireball (Oak Wand)'));
    spendUse(sh, 6, sh.equipment[6].blocks[0]);
    assert.equal(sh.equipment[6].blocks[1].left, 0);
    assert.equal(find(combatActions(sh), 'Fireball (Oak Wand)'), undefined, 'no charges left');
});

test('armor slots: each worn piece is sent with its slots; unequipped pieces do not count', () => {
    setRules(RULES);
    assert.deepEqual(armorList(sheet()), [{ name: 'Breastplate', dr: 4, covers: ['torso'] }, { name: 'Greaves', dr: 2, covers: ['legs'] }]);
    assert.equal(totalDR(sheet()), 6);
    assert.equal(compute(sheet()).ac, 16);
    assert.equal(compute(sheet()).attrs.Mind, 12, 'attribute modifier');
});

test('item ability: fixed level, the wielder does not need to know it, charges sent along', () => {
    setRules(RULES);
    const fb = find(combatActions(sheet()), 'Fireball (Oak Wand)');
    assert.equal(fb.target, 15);
    assert.deepEqual(fb.charges, { pool: 'Charges', left: 1, max: 7 });
});

test('XML: category as typed, blocks as child elements', () => {
    setRules(RULES);
    const sh = sheet();
    const x = toXml(sh);
    assert.match(x, /<Longbow_3 category="whatever">/);
    assert.match(x, /<attack skill="Bow" damage="1d8" use="ranged" range="150"\/>/);
    assert.match(x, /<consumes item="Arrows" per_use="1" left="2"\/>/);
    assert.match(x, /<defense kind="armor" value="4" slots="torso"\/>/);
    assert.match(x, /<Spare_helm equipped="no">/);
    assert.match(x, /<ability name="Fireball"[^>]*level="15"/);
    assert.match(x, /<charges name="Charges" left="1" max="7"\/>/);
    assert.match(x, /<Arrows qty="2" category="ammo"\/>/);
});

test('items the LLM describes by text get blocks', () => {
    setRules(RULES);
    const acts = combatActions({ enabled: true, attrs: { Dex: 12 }, skills: [{ name: 'Sword', attr: 'Dex', level: 12 }],
        equipment: [{ name: 'Sword', category: 'weapon', stat: 'sw cut', qty: 1 }, { name: 'Mail', category: 'armor', stat: 'DR 3 covers torso, arms', qty: 1 }].map(itemFromText) });
    assert.equal(find(acts, 'Sword Attack').target, 12);
    assert.equal(find(acts, 'Parry (Sword)').target, 9);
    assert.deepEqual(armorList({ equipment: [itemFromText({ name: 'Mail', category: 'armor', stat: 'DR 3 covers torso, arms', qty: 1 })] }), [{ name: 'Mail', dr: 3, covers: ['torso', 'arms'] }]);
    const sh = sheetFromLLM({ equipment: [{ name: 'Sword', category: 'weapon', damage: 'sw cut {{flaming}}' }, { name: 'Mail', category: 'armor', armor: 3 }, 'Rope'] });
    assert.deepEqual(sh.equipment.map(e => e.blocks.map(b => b.type)), [['attack'], ['defense'], []]);
    assert.equal(sh.equipment[0].blocks[0].damage, 'sw cut');
    assert.equal(sh.equipment[0].effect, '{{flaming}}', 'macros in the text move to the story notes');
    assert.ok(!('stat' in sh.equipment[0]) && !('skill' in sh.equipment[0]));
});

test('rules itemPresets: kept from the rules; formulas in [brackets]; Consumes can spend a pool', async () => {
    const { rules, expandFormulas } = await import('../src/engine/index.js');
    setRules({ ...RULES, attributes: [{ key: 'ST', label: 'Strength' }, { key: 'Dex', label: 'Dexterity' }], resources: [{ name: 'FP', max: '10' }],
        damageTable: [{ at: 10, thrust: '1d-2', swing: '1d' }], roles: { damage: 'ST', defaultAttr: 'Dex' },
        itemPresets: [{ name: 'Melee weapon', category: 'weapon', blocks: [{ type: 'attack', label: 'Swing', damage: 'sw+1 cut' }, { type: 'attack', label: 'Thrust', damage: 'thr+1 imp' }, { type: 'bogus' }] }, { category: 'no name' }] });
    assert.equal(rules().itemPresets.length, 1);
    assert.equal(rules().itemPresets[0].blocks.length, 2);
    assert.equal(expandFormulas('1d8+[floor((Dex-10)/2)]', { Dex: 8 }), '1d8-1');
    const sh = { enabled: true, attrs: { ST: 10, Dex: 14 }, skills: [{ name: 'Axe', attr: 'Dex', level: 12 }], equipment: [
        { name: 'Axe', qty: 1, blocks: [{ type: 'attack', label: 'Swing', skill: 'Axe', damage: 'sw+[floor((Dex-10)/2)] cut', use: 'melee' }, { type: 'consumes', from: 'pool', pool: 'FP', per: 1 }] },
        { name: 'Mace', qty: 1, blocks: [{ type: 'attack', roll: 'fixed', level: 'Dex+2', damage: '1d6', use: 'melee' }] }] };
    const acts = combatActions(sh);
    const dmg = find(acts, 'Axe Swing Damage');
    assert.equal(dmg.n, 1); assert.equal(dmg.add, 2);
    const atk = find(acts, 'Axe Swing');
    assert.equal(atk.cost, 1); assert.equal(atk.resource, 'FP');
    assert.equal(find(acts, 'Mace Attack').target, 16);
    assert.match(toXml(sh), /<consumes pool="FP" per_use="1"\/>/);
});

test('the generic default rules load, compute a sheet and give working item presets', async () => {
    const { GENERIC_RULES } = await import('../src/rules/generic.js');
    const { rules, formulaError } = await import('../src/engine/index.js');
    setRules(GENERIC_RULES);
    const r = rules();
    assert.equal(r.attributes.length, 4);
    assert.equal(r.itemPresets.length, GENERIC_RULES.itemPresets.length, 'no preset dropped');
    for (const f of [r.dodge, r.parry, r.block, r.unskilled, r.basicLift, ...r.secondary.map(x => x.base)]) assert.equal(formulaError(f), '', f);
    const sh = { enabled: true, attrs: { BOD: 12, AGI: 11, MND: 10, SPI: 10 }, skills: [{ name: 'Sword', attr: 'AGI', level: 12 }],
        equipment: r.itemPresets.map(p => ({ name: p.name === 'Sword / axe' ? 'Sword' : p.name, qty: p.qty ?? 1, category: p.category, blocks: JSON.parse(JSON.stringify(p.blocks)) })) };
    const c = compute(sh);
    assert.equal(c.values.HP, 12);
    assert.equal(c.values.Move, 5);
    const acts = combatActions(sh);
    assert.equal(find(acts, 'Sword Swing').target, 12);
    assert.equal(find(acts, 'Sword Swing Damage').text ?? find(acts, 'Sword Swing Damage').note, 'sw cut');
    assert.ok(find(acts, 'Parry (Sword)'));
    assert.ok(find(acts, 'Bow Attack').ammo);
    assert.ok(find(acts, 'Block (Shield)'));
    assert.ok(find(acts, 'Firebolt (Magic wand)'));
    assert.ok(find(acts, 'Drink (Healing potion)'));
    assert.deepEqual(armorList(sh).map(a => a.dr), [2, 5, 3]);
    assert.equal(c.attrs.SPI, 11, 'ring');
});
