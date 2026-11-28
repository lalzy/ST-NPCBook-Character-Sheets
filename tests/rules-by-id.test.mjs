// Settings keep only the active rules template's id; the rules are fetched by it at start. Built-ins are never stored.
import test from 'node:test';
import assert from 'node:assert/strict';
import { activeRules, applyRules } from '../src/core/context.js';
import { GENERIC_RULES } from '../src/rules/generic.js';
import { MODULE } from '../src/core/constants.js';

const withSettings = (stored) => {
    const es = { [MODULE]: stored };
    globalThis.SillyTavern = { getContext: () => ({ extensionSettings: es, saveSettingsDebounced() {} }) };
    return es;
};

test('new install: Generic by id; an older stale copy of Generic goes back to the built-in and is dropped', () => {
    let es = withSettings(undefined);
    assert.deepEqual(activeRules(), GENERIC_RULES);
    assert.equal(es[MODULE].rulesTemplates.active, 'builtin:generic');
    assert.ok(!('rules' in es[MODULE]));
    es = withSettings({ rules: { name: GENERIC_RULES.name, attributes: [] } });
    assert.deepEqual(activeRules(), GENERIC_RULES);
    assert.ok(!('rules' in es[MODULE]));
    applyRules();
});

test('the user\'s own template is read by its id', () => {
    withSettings({ rulesTemplates: { active: 'my-world', items: { 'my-world': { name: 'My world', rules: { name: 'My world', attrBase: 12 } } } } });
    assert.equal(activeRules().attrBase, 12);
});
