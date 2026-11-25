# NPC Book Character Sheet: technical spec

For users, see [README.md](README.md). This file is for anyone changing the code or building on it.

The extension ships **no rules data**. Every cost, table, multiplier and formula comes from the user's rules config (`settings.rules`), which is empty by default. The engine only does generic arithmetic on what the user typed in.

## Code layout

`index.js` is the entry point (the file `manifest.json` loads). It only connects the modules below, in this order: settings → rules → settings panel → Roll Dice → NPC Book.

```
index.js                      entry point
src/
  core/
    constants.js              MODULE ('npc_book_gurps'), EXT_ID ('gurps'), TITLE, DEFAULTS, CATEGORIES
    context.js                ctx(), settings(), applyRules()
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
    skills.js                 relativeLevel, pointsForRelative (user cost table)
    compute.js                compute(): derived values, encumbrance, skills, points
    xml.js                    toXml, xmlName
    llm.js                    sheetFromLLM
    dice.js                   parseDice, weaponDamage, parseDR, totalDR
    combat.js                 combatActions
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

Dependency direction: `ui` / `integrations` → `engine` → `rules` → `utils`. `engine` and `rules` never touch the DOM or SillyTavern. The storage keys `npc_book_gurps` and `gurps` are kept from earlier versions so saved settings and sheets still load.

## Settings

Stored in `extensionSettings.npc_book_gurps`, back-filled from `DEFAULTS`:

| Key | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Master switch. |
| `sendXml` | `true` | Send `toXml()` of enabled sheets through `sceneXml`. |
| `generateForNew` | `true` | Default for "ask the AI for a sheet for new NPCs". |
| `defaultBudget` | `100` | Budget for new sheets and for `sheetFromLLM`. |
| `rules` | `{}` | The user's rules config. See RULES.md for every key. `applyRules()` loads it into the engine at start-up and on save. |

Per-chat override: `chatMetadata.npc_book_gurps.generate` (`true` / `false`; absent = follow `generateForNew`). See `src/chat/generation.js`.

## Rules config (`src/rules`)

`normalizeRules()` validates an object and drops unknown keys. `setRules()` makes it the engine's active config; `rules()` returns it. When a value is missing, the engine leaves the derived value out (`null`, shown as "—") instead of guessing:

- No `attributes` → the sheet has no attributes; skills are just their number. No `attrCost` → attributes cost 0. No `attrBase` → sheets start at an engine fallback of 10.
- No `secondary` → no secondary stats. No `roles.health` / `stamina` / `speed` → hp / fp / speed passed to Roll Dice are `null`.
- No `basicLift` or `encumbrance` → no encumbrance; Move = the `roles.move` secondary if defined.
- No `damageTable` or `roles.damage` → no thrust / swing; `thr` / `sw` damage stats don't parse.
- No `skillCosts` → a skill's number is its level above the attribute, and skills add no points.
- No `dodge`, `parry`, `block` → those defenses are not offered.
- No `unskilled` → untrained attacks use the `roles.defaultAttr` attribute (else the first attribute).
- No `woundMultipliers` → multiplier 1.

`formula.js` is a recursive-descent parser for numbers, `+ - * /`, brackets, unary minus, `floor ceil round min max abs`, and named variables. Unknown names or anything else is an error, and the formula then evaluates to `null`.

## Sheet data

Stored by NPC Book under extension id `gurps` (card: `template.ext.gurps`; persona: `getPersonaData('gurps')`). `normalizeSheet()` fills missing structure; a sheet saved without `enabled` is switched on only if it is not blank.

```js
{
  version: 1,
  enabled: false,          // only enabled sheets are sent / rollable
  budget: 100, tl: '', sm: 0,
  attrs: { [attribute key]: value },   // keys from rules.attributes
  sec: { [secondary key]: steps },   // each a number of steps from its base
  traits:    [{ name, pts, effect }],          // pts > 0 positive trait, < 0 negative trait
  skills:    [{ name, attr, diff, pts }],      // attr: an attribute or secondary key; diff: a key from skillDifficulties
  equipment: [{ name, qty, weight, value, category, stat, skill, effect }],  // weight and value per item
  abilities: [{ name, kind, use, fx, aim, skill, damage, stat, mod, duration, resist, range, cost, pts, effect }],
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
- Parry (non-ranged, non-shield) and Block (shield) from the `parry` / `block` formulas, plus `defenseTraits` bonuses.
- Unarmed attacks from `unarmedAttacks`, at the best `unarmedSkills` level (else the default attribute), with the per-die damage bonus from that skill's `bonus` rows.
- Dodge from `compute()` plus `defenseTraits` bonuses, then every skill with a level under "Skills & spells".
- Total armor: sum of `DR n` / `armor n` in `stat` over items whose category matches `armor`.
- Abilities (group `Abilities`): every ability with a level gives a roll entry `{ name, target, ability: kind, attack: true, use, fx, aim, resist, stat, mod, duration, amount, ranged, range, reach, cost, effect }`; damage abilities also give a damage entry flagged `ability`.
- The Roll Dice character entry also carries `hp`, `fp`, `move`, `speed` and `attrs` (attributes, secondary stats and lift, for resistance rolls).

## LLM output (`sheetFromLLM`)

`src/integrations/npcBook/prompt.js` builds the rule from the active config (attribute keys from `rules.attributes`; without attributes, skills are `["Skill name", 12]`). It asks only for numbers and invented names (no point costs):

```
"sheet": {"<attribute key>": n, …, "skills": [["Skill name", "<default attribute>", 12]], "traits": [["Trait name", "short note"]], "equipment": [{"name": "Item", "category": "weapon", "damage": "1d+1", "weight": 2}], "abilities": [{"name": "Ability", "kind": "spell", "use": "ranged", "fx": "damage", "on": "enemy", "skill": "Ability", "damage": "2d", "range": 20, "fp": 2}]}
```

Accepted shapes (older chats wrote the key `gurps`; it is still read):

- Attributes: numbers, clamped to 1–99 and rounded.
- `skills`: `[name, attr, level]`, `[name, level]`, `[name, attr, diff, level]`, `{ name, attr, diff, level | SL }`, or `{ "Name": level }`. Unknown attr → the default attribute. Points from `pointsForRelative()` (or the relative level without a cost table).
- `traits`: `[name, note]`, `[name, pts, note]`, `{ name, pts, effect }`, or a bare string.
- `equipment`: a string, or `{ name, qty, weight, value, category, damage | stat, armor, skill, effect }`.
- `abilities`: `{ name, kind, use, fx, on | aim, skill, damage | amount, stat, mod, turns | duration, resist, range | reach, fp | cost, pts, effect }`, `[name, kind, use, damage, range, fp]`, or a bare string.

The result is enabled and uses `defaultBudget`.

## XML sent to the AI (`toXml`)

`sceneXml` returns `toXml()` wrapped in one `<sheet>` element for every sheet that is switched on (also when it holds only defaults; the chat copy, else the library card), which NPC Book places inside the character's `<char>` / `<user>` entry. Empty blocks are left out. `<stats>` holds the lines from `rules.sheetXml.stats` (`{ tag, of }`, `of` = attribute, secondary key or `lift`), then one line with any secondary key not in that layout; with neither, there is no `<stats>`. Skill/ability level, relative level and ability cost use `sheetXml.level` / `relative` / `cost` (default `level`, `relative`, `cost`); item weight is followed by `liftUnit`. Free-text names become element/attribute names through `xmlName()` (spaces and `/` → `_`, characters other than letters, digits, `_ . -` dropped, `_` prefix if it does not start with a letter)

## NPC Book hooks (`register.js`)

Registered with `registerExtension` (on `window.NPCBook` if present, else on the `npcbook:ready` event; a toast warns after 15 s if NPC Book never appears):

| Hook | Use |
|---|---|
| `defaultData` | `defaultSheet()` with `defaultBudget`. |
| `cardTab` | "Sheet" tab (`fa-users-viewfinder`) → `renderSheet`. |
| `personaSheet` | "Character Sheet" tab → `renderSheet` with key `user`. |
| `sceneXml` | `toXml()` when enabled, `sendXml` on, sheet enabled and not blank. |
| `instructions` | Adds `newNpcRule()` when enabled, `autoCreate` and generation is on for the chat. |
| `fromTracker` | `sheetFromLLM(entry.sheet ?? entry.gurps, defaultBudget)` when enabled and generation is on for the chat. |
| `sceneButton` | `fa-users-viewfinder`; `active` = generation on for this chat; click toggles the chat's override. |

## Roll Dice hooks (`integrations/rollDice`)

- Registers source `{ id: 'gurps', label: 'Character sheet', getCharacters }` when `window.RollDice` exists and again on every `rolldice:ready` event.
- `getCharacters()` returns the persona (key `user`) and each scene NPC with an enabled sheet: `{ key, name, prefix, rollables, combat, dr, hp, fp, move, speed, attrs }`.
- `rollables`: attributes, secondary stats that have a `roll` name, Dodge (if defined), each skill and ability with a level.
- Sheet buttons call `RollDice.open({ preset: 'skill' | 'combat', skill, target, character, rollable })`. Dice, comparison and critical totals come from Roll Dice's own settings.
