// Sheet rules that used to be fixed in the code: gear bonuses (a shield's DB on Block), the skill a shield or weapon
// uses without a skill field, and skill points turned into levels.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setRules, compute, combatActions, weaponSkill, itemFromText } from '../src/engine/index.js';

const RULES = {
    attributes: [{ key: 'Dex', label: 'Dexterity' }, { key: 'Mind', label: 'Mind' }], attrBase: 10, roles: { defaultAttr: 'Dex' },
    parry: 'floor(skill / 2) + 3', block: 'floor(skill / 2) + 3', dodge: '8', armorClass: '10 + armor', unskilled: 'Dex - 5',
};
const target = (acts, name) => acts.find(a => a.name === name)?.target;

test('gearBonuses: a shield the LLM writes with "DB 2" adds to Block, Parry and Dodge (only what `adds` lists)', () => {
    // the items as the LLM describes them, turned into blocks under the rules in force
    const sheet = () => ({ enabled: true, attrs: { Dex: 12 }, skills: [{ name: 'Shield', attr: 'Dex', level: 14 }, { name: 'Sword', attr: 'Dex', level: 12 }],
        equipment: [{ name: 'Round Shield', category: 'shield', stat: 'DB 2', qty: 1 }, { name: 'Sword', category: 'weapon', stat: 'sw cut', qty: 1 }, { name: 'Ring', category: 'valuable', stat: 'AC +1, DB 5', qty: 1 }].map(itemFromText) });
    setRules({ ...RULES, gearBonuses: [{ word: 'DB', categories: ['shield'], adds: ['block', 'parry', 'dodge'] }, { word: 'AC', adds: ['armorClass'] }] });
    const all = sheet();
    const acts = combatActions(all);
    assert.equal(target(acts, 'Block (Round Shield)'), 7 + 3 + 2);
    assert.equal(target(acts, 'Parry (Sword)'), 6 + 3 + 2);
    assert.equal(target(acts, 'Dodge'), 8 + 2);
    assert.equal(compute(all).ac, 10 + 1, 'the ring\'s AC counts, its DB does not (not a shield)');
    setRules({ ...RULES, gearBonuses: [{ word: 'DB', categories: ['shield'], adds: ['block'] }] });
    const only = combatActions(sheet());
    assert.equal(target(only, 'Block (Round Shield)'), 12);
    assert.equal(target(only, 'Parry (Sword)'), 9);
    assert.equal(target(only, 'Dodge'), 8);
});

test('a shield without a skill field still uses its skill: category word, name word, or categorySkills', () => {
    setRules(RULES);
    const lv = (map) => Object.entries(map).map(([name, level]) => ({ name, level }));
    const sk = lv({ Shield: 14 });
    assert.deepEqual(weaponSkill({ name: 'Kite Shield', category: 'shield' }, sk), { level: 14, skill: 'Shield' });
    assert.deepEqual(weaponSkill({ name: 'Large Shield', category: 'gear' }, sk), { level: 14, skill: 'Shield' });
    assert.deepEqual(weaponSkill({ name: 'Kite Shield', category: 'shield', skill: 'Missing' }, sk), { level: 14, skill: 'Shield' }, 'a skill field naming a skill not on the sheet falls through');
    setRules({ ...RULES, categorySkills: [{ category: 'buckler', skill: 'Buckler Use' }] });
    assert.deepEqual(weaponSkill({ name: 'Target', category: 'buckler' }, lv({ 'Buckler Use': 13 })), { level: 13, skill: 'Buckler Use' });
    assert.equal(weaponSkill({ name: 'Target', category: 'shield' }, lv({})), null, 'no matching skill: untrained');
    const sheet = { enabled: true, attrs: { Dex: 12 }, skills: [{ name: 'Shield', attr: 'Dex', level: 14 }], equipment: [itemFromText({ name: 'Kite Shield', category: 'shield', stat: '', qty: 1 })] };
    setRules(RULES);
    assert.equal(target(combatActions(sheet), 'Block (Kite Shield)'), 10, 'Shield 14 → Block 10, not untrained');
});

test('skill points become levels from the rules (skillCosts, skillCostEach, skillDifficulties)', () => {
    setRules({ ...RULES,
        skillCosts: [{ pts: 1, level: 0 }, { pts: 2, level: 1 }, { pts: 4, level: 2 }], skillCostEach: { pts: 4, level: 1 },
        skillDifficulties: [{ name: 'Easy', base: 0 }, { name: 'Hard', base: -2 }] });
    const sheet = { enabled: true, attrs: { Dex: 12, Mind: 11 }, skills: [
        { name: 'Shield', attr: 'Dex', points: 4, diff: 'Easy' },
        { name: 'Sword', attr: 'Dex', points: 8, diff: 'Hard' },
        { name: 'Lore', attr: 'Mind', points: '', level: 13 },
        { name: 'Nothing', attr: 'Mind', points: 0, diff: 'Easy' },
    ] };
    assert.deepEqual(compute(sheet).skills.map(s => [s.name, s.level, s.fromPoints]),
        [['Shield', 14, true], ['Sword', 13, true], ['Lore', 13, false], ['Nothing', null, true]]);
    setRules(RULES);
    assert.equal(compute(sheet).skills[0].level, null, 'without a cost table points are ignored and the typed level is used');
});
