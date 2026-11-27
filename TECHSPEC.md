# NPC Book Character Sheet: technical spec

For users, see [README.md](README.md). This file is for anyone changing the code or building on it.

The extension ships **no rules data**. Every table, multiplier and formula comes from the user's rules config (`settings.rules`), which is empty by default. The engine only does generic arithmetic on what the user typed in.

## Code layout

`index.js` is the entry point (the file `manifest.json` loads). It only connects the modules below, in this order: settings → rules → settings panel → Roll Dice → NPC Book.

```
index.js                      entry point
src/
  core/
    constants.js              MODULE (settings key) and EXT_ID (NPC Book / Roll Dice id), both 'NPC_Book_character_sheet';
                              TITLE, DEFAULTS, CATEGORIES
    context.js                ctx(), settings(), chatMeta(), applyRules()
  rules/
    ruleset.js                EMPTY_RULES, BLANK_TEMPLATE, normalizeRules, setRules / rules(), helpers
    formula.js                evalFormula, formulaError (safe arithmetic, no eval)
  utils/
    number.js                 num, fmt, signed
    html.js                   esc
  engine/                     pure sheet engine, no DOM (runs in Node)
    index.js                  public API
    rules.js                  sheet vocabulary only (attribute names, ability kinds / uses / effects)
    strength.js               lift and thrust/swing lookups from the user's config
    sheet.js                  defaultSheet, isBlankSheet, normalizeSheet
    compute.js                compute(): derived values, encumbrance, skills
    xml.js                    toXml, xmlName
    llm.js                    sheetFromLLM
    dice.js                   parseDice, weaponDamage, parseDR, totalDR, gearBonuses
    combat.js                 combatActions, weaponSkill
    skills.js                 relativeLevel / pointsForRelative (skillCosts table)
  chat/
    generation.js             per-chat "generate sheets for new NPCs" choice + change listeners
  integrations/
    rollDice/                 api.js (open), rollables.js, source.js (character source)
    npcBook/                  register.js (registerExtension), sceneButton.js, prompt.js
  ui/
    settings/                 template.js (markup, notice), panel.js (bindings, rules editor, chat state line)
    sheet/
      index.js                renderSheet(): normalize → bind events → draw
      sections/               one file per sheet section + index.js assembler
      widgets.js              stepper, roll button, empty row
      labels.js               computed labels shared by render and refresh
      refresh.js              in-place refresh of computed values (keeps input focus)
      mutations.js            pure edits to the sheet draft
      events.js               delegated DOM handlers
```

Dependency direction: `ui` / `integrations` → `engine` → `rules` → `utils`. `engine` and `rules` never touch the DOM or SillyTavern. The storage keys (`MODULE`, `EXT_ID`) never change, so saved settings and sheets still load.

## Settings

Stored in `extensionSettings[MODULE]`, back-filled from `DEFAULTS`:

| Key | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Master switch. |
| `sendXml` | `true` | Send `toXml()` of enabled sheets through `sceneXml`. |
| `generateForNew` | `true` | Default for "ask the AI for a sheet for new NPCs". |
| `rules` | `{}` | The user's rules config. See RULES.md for every key. `applyRules()` loads it into the engine at start-up and on save. |

Per-chat override: `chatMetadata[MODULE].generate` (`true` / `false`; absent = follow `generateForNew`). See `src/chat/generation.js`.

## Rules config (`src/rules`)

`normalizeRules()` validates an object and drops unknown keys. `setRules()` makes it the engine's active config; `rules()` returns it. When a value is missing, the engine leaves the derived value out (`null`, shown as "—") instead of guessing:

- No `attributes` → the sheet has no attributes; skills are just their number. No `attrBase` → sheets start at an engine fallback of 10.
- No `secondary` → no secondary stats. No `roles.health` / `stamina` / `speed` → hp / fp / speed passed to Roll Dice are `null`.
- No `basicLift` or `encumbrance` → no encumbrance; Move = the `roles.move` secondary if defined.
- No `damageTable` or `roles.damage` → no thrust / swing (hidden on the sheet); `thr` / `sw` damage stats don't parse.
- No `dodge`, `parry`, `block` → those defenses are not offered (Dodge is hidden on the sheet).
- No `armorClass` → no armor class (`ac` is null; Combat Mode works one out when the game system needs it).
- No `unskilled` → untrained attacks use the `roles.defaultAttr` attribute (else the first attribute).
- No `woundMultipliers` → multiplier 1.

`formula.js` is a recursive-descent parser for numbers, `+ - * /`, brackets, unary minus, `floor ceil round min max abs`, and named variables. Unknown names or anything else is an error, and the formula then evaluates to `null`.

## Sheet data

Stored by NPC Book under the extension id `EXT_ID` (card: `template.ext[EXT_ID]`; persona: `getPersonaData(EXT_ID)`). `normalizeSheet()` fills missing structure; a sheet saved without `enabled` is switched on only if it is not blank.

```js
{
  version: 1,
  enabled: false,          // only enabled sheets are sent / rollable
  attrs: { [attribute key]: value },   // keys from rules.attributes
  sec: { [secondary key]: steps },   // each a number of steps from its base
  traits:    [{ name, effect }]
  skills:    [{ name, attr, level }],          // level: the number typed in ('' = none); attr: an attribute or secondary key, a label only
  equipment: [{ name, qty, weight, value, category, stat, skill, effect }],  // weight and value per item
  abilities: [{ name, kind, use, fx, aim, skill, damage, stat, mod, duration, resist, range, cost, effect }],
                           // kind: free text; use: ranged | melee | utility (= direct, no defense);
                           // fx: damage | heal | fp | buff | debuff | stun | disarm | none;
                           // aim: enemy | ally | self | any ('' = ally for heal/fp/buff, any for none, else enemy);
                           // skill: a skill name or attribute, '' = skill named like the ability
  reactions: [{ name, groups: [{ who, mod }] }],
  notes: '',               // never sent
}
```

`isBlankSheet()`: all attributes at the start value, all secondary steps 0, all lists empty. Blank sheets are never sent.

## Combat actions (`combatActions`)

Items count as weapons when `category` matches `weapon|shield|ranged|melee`.

- Attack level: the item's `skill`, else a skill named like the item, else the `unskilled` formula.
- Damage from `stat`: `sw` / `thr` (from `damageTable`) or `Nd`, an optional ± modifier and an optional damage type word. Multiplier from `woundMultipliers`.
- Parry (non-ranged, non-shield) and Block (shield) from the `parry` / `block` formulas, plus `defenseTraits` and `gearBonuses` bonuses. The skill is found by `weaponSkill()` (skill field, item name, `categorySkills`, category word, name word).
- Unarmed attacks from `unarmedAttacks`, at the best `unarmedSkills` level (else the default attribute), with the per-die damage bonus from that skill's `bonus` rows.
- Dodge from `compute()` (with `gearBonuses`) plus `defenseTraits` bonuses, then every skill with a level under "Skills & spells".
- Total armor: sum of `DR n` / `armor n` in `stat` over items whose category matches `armor`.
- Abilities (group `Abilities`): every ability with a level gives a roll entry `{ name, target, ability: kind, attack: true, use, fx, aim, resist, stat, mod, duration, amount, ranged, range, reach, cost, effect }`; damage abilities also give a damage entry flagged `ability`.
- The Roll Dice character entry also carries `hp`, `fp`, `move`, `speed`, `ac` (from the `armorClass` formula, else null) and `attrs` (attributes, secondary stats and lift, for resistance rolls).
- Dice: `Nd` (six-sided), `NdS` (any die size, e.g. `1d8+2`), `sw` / `thr` from the damage table. Damage entries carry `n`, `sides`, `add`.

## LLM output (`sheetFromLLM`)

`src/integrations/npcBook/prompt.js` builds the rule from the active config (attribute keys from `rules.attributes`; without attributes, skills are `["Skill name", 12]`). It asks only for numbers and invented names:

```
"sheet": {"<attribute key>": n, …, "skills": [["Skill name", "<default attribute>", 12]], "traits": [["Trait name", "short note"]], "equipment": [{"name": "Item", "category": "weapon", "damage": "1d6+1", "weight": 2}], "abilities": [{"name": "Ability", "kind": "spell", "use": "ranged", "fx": "damage", "on": "enemy", "skill": "Ability", "damage": "2d", "range": 20, "fp": 2}]}
```

Accepted shapes:

- Attributes: numbers, clamped to 1–99 and rounded.
- `skills`: `[name, attr, level]`, `[name, level]`, `{ name, attr, level }`, or `{ "Name": level }` (with more than three items the last one is the level). Unknown attr → the default attribute.
- `traits`: `[name, note]`, `{ name, effect }`, or a bare string (number items are ignored).
- `equipment`: a string, or `{ name, qty, weight, value, category, damage | stat, armor, skill, effect }`.
- `abilities`: `{ name, kind, use, fx, on | aim, skill, damage | amount, stat, mod, turns | duration, resist, range | reach, fp | cost, effect }`, `[name, kind, use, damage, range, fp]`, or a bare string.

The result is enabled.

## XML sent to the AI (`toXml`)

`sceneXml` returns `toXml()` wrapped in one `<sheet>` element for every sheet that is switched on (also when it holds only defaults; the chat copy, else the library card), which NPC Book places inside the character's `<char>` / `<user>` entry. Empty blocks are left out. `<stats>` holds the lines from `rules.sheetXml.stats` (`{ tag, of }`, `of` = attribute, secondary key or `lift`), then one line with any secondary key not in that layout; with neither, there is no `<stats>`. Skill/ability level and ability cost use `sheetXml.level` / `cost` (default `level`, `cost`); item weight is followed by `liftUnit`. Free-text names become element/attribute names through `xmlName()` (spaces and `/` → `_`, characters other than letters, digits, `_ . -` dropped, `_` prefix if it does not start with a letter)

## NPC Book hooks (`register.js`)

Registered with `registerExtension` (on `window.NPCBook` if present, else on the `npcbook:ready` event; a toast warns after 15 s if NPC Book never appears):

| Hook | Use |
|---|---|
| `defaultData` | `defaultSheet()`. |
| `cardTab` | "Sheet" tab (`fa-users-viewfinder`) → `renderSheet`. |
| `personaSheet` | "Character Sheet" tab → `renderSheet` with key `user`. |
| `sceneXml` | `toXml()` when enabled, `sendXml` on, sheet enabled and not blank. |
| `instructions` | Adds `newNpcRule()` when enabled, `autoCreate` and generation is on for the chat. |
| `fromTracker` | `sheetFromLLM(entry.sheet ?? entry[EXT_ID])` when enabled and generation is on for the chat. |
| `sceneButton` | `fa-users-viewfinder`; `active` = generation on for this chat; click toggles the chat's override. |

## Roll Dice hooks (`integrations/rollDice`)

- Registers source `{ id: EXT_ID, label: 'Character sheet', getCharacters }` when `window.RollDice` exists and again on every `rolldice:ready` event.
- `getCharacters()` returns the persona (key `user`) and each scene NPC with an enabled sheet: `{ key, name, prefix, rollables, combat, dr, hp, fp, move, speed, attrs }`.
- `rollables`: attributes, secondary stats that have a `roll` name, Dodge (if defined), each skill and ability with a level.
- Sheet buttons call `RollDice.open({ preset: 'skill' | 'combat', skill, target, character, rollable })`. Dice, comparison and criticals come from the chat's game system in Roll Dice (1.2+): the sheet value is a target to roll under, or a bonus against a target number.
