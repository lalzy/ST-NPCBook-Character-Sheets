// Instruction appended to NPC Book's tracker prompt when new NPCs should get a sheet.
// It asks only for numbers and free-text names: no point costs, no game-book data.
import { rules, skillAttrs, attrBase, attrKeys, defaultAttr } from '../../rules/ruleset.js';

export function newNpcRule() {
    const r = rules();
    const avg = r.attrBase !== null ? `${r.attrBase} = an average person` : 'plain numbers';
    const types = Object.keys(r.woundMultipliers);
    const typeHint = types.length ? ` optionally followed by one damage type word from: ${types.join(', ')}` : '';
    const base = attrBase();
    const attrs = attrKeys().map(k => `"${k}": ${base}, `).join('');
    const da = defaultAttr();
    return `- For a NEW character also add "sheet": {${attrs}"skills": [${da ? `["Skill name", "${da}", 12]` : '["Skill name", 12]'}], "traits": [["Trait name", "short note"]], "equipment": [{"name": "Item", "category": "weapon", "damage": "1d+1", "weight": 2}], "abilities": [{"name": "Ability", "kind": "spell", "use": "ranged", "fx": "damage", "on": "enemy", "skill": "Ability", "damage": "2d", "range": 20, "fp": 2}]} — ${attrs ? `attributes are ${avg}; ` : ''}skills as ${da ? `[name you invent, attribute (${skillAttrs().join(' / ')}), level as a number]` : '[name you invent, level as a number]'}; traits as [name you invent, short note]; equipment: category is free text (weapon, armor, shield, tool…), "damage" is dice like 2d+1${typeHint}, "armor": a number for protective items, weight and value as numbers; abilities only if the character has spells, psionics, powers or natural attacks (kind is free text; use ranged / melee (can be dodged) / utility (no defense); fx = damage / heal / fp / buff / debuff / stun / disarm / none; on = enemy / ally / self / any; skill = the skill or attribute rolled; damage = dice; buff/debuff add "stat" (attack / defense / skill / resist / dr / move / all), "mod" and "turns"; stun adds "turns"; "resist": an attribute if the target can resist; range as a number, reach for melee; fp = fatigue cost as a number). Use only numbers and names you make up; do not quote any rulebook.`;
}

/** The "sheet" object shown in NPC Book's example entries (built from the active rules: attribute keys, default attribute). */
function exampleSheet(enemy) {
    const base = attrBase();
    const da = defaultAttr();
    const sk = (name, lvl) => (da ? [name, da, lvl] : [name, lvl]);
    const sheet = Object.fromEntries(attrKeys().map(k => [k, base]));
    if (enemy) {
        sheet.skills = [sk('Knife', 11), sk('Stealth', 12)];
        sheet.traits = [['Cowardly', 'flees when hurt']];
        sheet.equipment = [{ name: 'Rusty knife', category: 'weapon', damage: '1d', weight: 1 }];
    } else {
        sheet.skills = [sk('Herbalism', 13), sk('Haggling', 11)];
        sheet.traits = [['Blunt', 'says what she thinks']];
        sheet.equipment = [{ name: 'Herb satchel', category: 'tool', weight: 2, value: 15 }];
    }
    return JSON.stringify(sheet).replace(/([,:])(?=["\[{\d-])/g, '$1 ');
}

/**
 * Extend NPC Book's example: every new character in the <npcs> example gets a "sheet" inside its own entry
 * (before the entry's closing brace). Entries that already have one are left alone.
 */
export function addSheetToExample(text) {
    const out = String(text ?? '');
    const at = out.search(/\n\s*Example:\s*\n/);
    if (at < 0) return out;
    const lines = out.slice(at).split('\n').map((line) => {
        if (!/"new":\s*true/.test(line) || /"sheet":/.test(line)) return line;
        const end = line.lastIndexOf('}');
        if (end < 0) return line;
        return `${line.slice(0, end)}, "sheet": ${exampleSheet(/"enemy":\s*true/.test(line))}${line.slice(end)}`;
    });
    return out.slice(0, at) + lines.join('\n');
}
