# Rules config (NPC Book - Character Sheet)

Go to **Extensions → NPC Book - Character Sheet → Rules templates**, click **New** (it starts with every key, empty), fill in the JSON in the box and click **Save**.

This file describes exactly what the code reads. Everything else is ignored.

---

## How saving works

1. The box must hold valid JSON. If it doesn't, nothing is saved and you get the parser error.
2. The object is stored **as you wrote it**, then normalized each time it is used (`src/rules/ruleset.js → normalizeRules`):
   - **Unknown keys are dropped without a warning.** That includes keys from older examples that the code never reads: `attrCost`, a secondary stat's `cost`, and `sheetXml.relative`. `armorCategories` and `gearBonuses` are not used for items: armor and bonuses are set in each item's blocks (see *Items*).
   - Entries that break a rule below (for example a key with a space in it) are dropped one by one, also without a warning.
3. After saving, these formulas are checked for **syntax only**: every `secondary[].base`, `basicLift`, `dodge`, `parry`, `block`, `armorClass` and `unskilled`. The check doesn't look at names, so a typo like `Stregth` passes the check and only fails when the sheet is computed. These formulas are **not checked at all**: `unarmedLevel`, `resources[].max`, and an ability's `dc`.
4. A formula that fails at run time (unknown name, bad syntax, division by zero) gives **0** for a secondary stat's base. For `resources[].max` and `[bracket]` formulas in item text it gives **0**. For every other formula it gives **"not set"**: the sheet shows "—" and that feature switches off.

Every key is optional. With no rules at all the sheet still works as a plain record: it stores what you type and rolls against any number.

---

## Names (keys)

Attribute keys, secondary keys, role values, `hpRoll.per` and `sheetXml` tags must match `^[A-Za-z_][A-Za-z0-9_]*$`: a letter or `_` first, then letters, digits and `_`. No spaces, dashes or dots. Keys are **case-sensitive** in formulas (`ST` is not `st`).

---

## Formula language (sheet formulas)

| Allowed | Notes |
|---|---|
| numbers | `3`, `0.25`, `.5` |
| `+ - * /`, brackets, unary minus | normal precedence |
| `floor ceil round min max abs` | function names are case-insensitive; `min`/`max` take any number of arguments |
| names | attribute keys, secondary keys (only those **above** the formula in `secondary`), `lift`, `HPRolls`, plus the extra names listed for each key below |

There are no comparisons, no `if`, no `^` and no `%`. To get a step function, use `floor`/`min`/`max`. For example, `min(1, floor(x / 10))` is 0 below 10 and 1 from 10 up.

---

## Key reference

### `name` (text)
Shown at the top of every sheet. Default: "Character sheet".

### `attributes` (list of `{ key, label }`)
The main stats. `label` defaults to `key`. Duplicate keys are dropped (the first one is kept).
```json
"attributes": [ { "key": "ST", "label": "Strength" }, { "key": "DX", "label": "Dexterity" } ]
```
Each attribute gets a stepper and a roll button on the sheet. It also becomes a rollable in Roll Dice under *Attributes*, using its **label** as the roll name.

### `attrBase` (number)
The value a new or unset attribute starts at. If you leave it out it's **10**. Sheets the LLM writes clamp attributes to 1–99.

### `secondary` (list of `{ key, label, base, step, roll }`)
Stats worked out from other stats, computed **in list order**.

| Field | Meaning |
|---|---|
| `key` | Required. Must not be the same as an attribute key, or the entry is dropped. |
| `label` | Shown on the sheet. Default: `key`. |
| `base` | Formula. It can use attributes, secondary keys **above** this one, and `HPRolls` (see `hpRoll`). It **cannot** use `lift`, because lift is computed after all secondary stats. |
| `step` | Default 1 (`0` also counts as 1). The sheet stores how many steps you clicked up or down, and **value = base + step × clicks**. Use `0.25` for something like Basic Speed. |
| `roll` | Optional. If set, the stat gets a roll button, and Roll Dice gets a *Checks* rollable with this name. |

There is no point cost. A `cost` field is ignored.

### `roles` (object)
Tells the code which of your keys does what. Each value must be a key name.

| Role | Must name | Used for |
|---|---|---|
| `damage` | an **attribute** | Picks the `damageTable` row. |
| `defaultAttr` | an attribute or a secondary stat | The attribute of a skill that names none. The fallback level for untrained and unarmed attacks. The base that `unarmedSkills[].over` counts from. If left out: the first attribute. |
| `health` | a **secondary** stat | HP sent to Roll Dice and Combat Mode. A heal ability's text uses its label. |
| `stamina` | a **secondary** stat | FP sent to Combat Mode, and the default ability resource (named after its label) when `resources` is empty. |
| `speed` | a **secondary** stat | Speed sent to Combat Mode (used for initiative). |
| `move` | a **secondary** stat | The sheet's Move. Encumbrance multiplies it, and it is sent to Combat Mode. |

`health`, `stamina`, `speed` and `move` are read from secondary stats only. If you point one at an attribute, the result is empty.

### `basicLift` (formula) and `liftUnit` (text)
`basicLift` can use attributes and secondary stats. Its result is available as **`lift`** to `dodge`, `armorClass`, `unskilled`, `unarmedLevel`, `resources` and ability `dc` formulas. `liftUnit` is printed after the lift and after every item weight on the sheet, and after item weights in the XML (the lift in the XML `<stats>` has no unit).

### `damageTable` (list of `{ at, thrust, swing }`)
A row needs a numeric `at` (the old name `st` is also read) and at least one of `thrust` / `swing`. Rows are sorted by `at`. The sheet uses the row with the highest `at` that is at or below the `roles.damage` attribute. **A value below the lowest row uses the lowest row.**
Dice text is `NdM±K`. A bare `d` means d6, so `1d-2` is 1d6−2. Negative adds are allowed.

### `encumbrance` (list of `{ name, load, move, dodge }`)
`name` and a numeric `load` are required. `move` defaults to 1 and `dodge` to 0. Rows are sorted by `load`.

- Carried weight is the sum of `weight × qty` over **all** equipment.
- The level is the first row where carried ≤ `load × lift`.
- Above the last row the character is **Overloaded**: Move becomes 0, and Dodge uses the last row's `dodge`.
- Move = `floor(move role value × row.move)`. Dodge = the `dodge` formula + `row.dodge`.
- Without `basicLift` there is no encumbrance at all.

### `dodge` (formula)
It can use attributes, secondary stats, `lift` and `HPRolls` (only when `hpRoll` is set and the rules have at least one secondary stat). The result is **not rounded**, so wrap it in `floor()` if you need a whole number. The encumbrance `dodge` and every active `modifier` block aimed at `dodge` are added. For combat entries the `defenseTraits` bonus is added too. The sheet's own Dodge display and the Roll Dice *Defense → Dodge* rollable don't include that trait bonus.

### `parry` / `block` (formulas)
Their **only** variable is `skill`, the level of the weapon or shield. Any other name makes the result empty. The result is rounded down, then the `defenseTraits` bonus and the item `modifier` blocks aimed at `parry` / `block` are added.

- A **Parry** is made once per carried item that has an `attack` block with `use: "melee"`, unless that item also has a `defense` block with `kind: "block"`. Your best unarmed skill (see `unarmedSkills`) also gets a Parry, only when `unarmedAttacks` has at least one entry.
- A **Block** is made for every `defense` block with `kind: "block"` on an equipped item. The block's `value` is added to it.
- The skill an attack or block rolls with: see *An item's level* under "What is fixed in the code".

### `armorClass` (formula)
It can use attributes, secondary stats, `lift` and **`armor`** (the sum of the `value` of every `defense` block with `kind: "armor"` on equipped items, each plus its item's `item:armor` modifiers, plus `modifier` blocks aimed at `armor`). The result is rounded down, then `modifier` blocks aimed at `armorClass` are added, and it is shown as AC. It is sent as `ac` and used when the game system attacks against a fixed defense.

### `unskilled` (formula)
The level for a weapon or ability with no matching skill (rounded down). It can use attributes, secondary stats and `lift`. If it's empty, the `defaultAttr` value is used.

### `unarmedLevel` (formula)
The level of unarmed attacks when the sheet has **none** of the `unarmedSkills`. If it's empty, the `defaultAttr` value is used. This formula isn't checked when you save.

### `unarmedAttacks` (list of `{ name, levelMod, damage }`)
If this list is empty, characters have no unarmed attacks and no unarmed Parry. Each entry is rolled at the unarmed level + `levelMod`. Its `damage` uses the weapon damage grammar below.

### `unarmedSkills` (list of `{ name, bonus: [{ over, perDie }] }`)
`name` is matched against skill names exactly (case is ignored), and the highest one on the sheet is used. `over` = that skill's level − the `defaultAttr` value. The bonus with the highest `over` that is reached adds `perDie × (number of thrust dice)` to every unarmed attack whose damage starts with `thr` or `sw`. Swing attacks also count thrust dice. That skill also gets a Parry (only when `unarmedAttacks` isn't empty).

### `woundMultipliers` (object, type → number) and `defaultDamageType` (text)
Keys are lower-cased. Types that aren't listed multiply by 1. The keys are also listed to the LLM as the damage-type words it may use. `defaultDamageType` is used when damage text has no type word.

### `resources` (list of `{ name, max }`)
What abilities spend (FP, mana, spell slots…). `max` is a formula. The result is rounded down, with a minimum of 0. A formula that fails gives 0. When more than one resource is set, an ability has a *Paid from* field. If the list is empty there is one resource: the `stamina` stat, named after its label. `max` isn't checked when you save.

### `hpRoll` (`{ per, dice, first }`)
HP from dice. One roll of `dice` is made per point of the value of `per`, which must be a key that comes before the secondary stat that uses it. With `first: "max"`, the first roll is the highest the dice can show. Rolls not made yet count as average (`n × (floor(sides/2)+1) + add`). The total is the formula variable **`HPRolls`**.

### `defenseTraits` (list of `{ name, bonus }`)
A trait whose name **starts with** `name` (case ignored) adds `bonus` to every Dodge, Parry and Block in the combat entries sent to Combat Mode. It is not added to the sheet's Dodge or to the Roll Dice *Defense → Dodge* rollable. All matching entries add up.

### `skillCosts` (list of `{ pts, level }`), `skillCostEach` (`{ pts, level }`) and `skillDifficulties` (list of `{ name, base }`)
Skill points turned into levels. If `skillCosts` is empty (the default), skill levels are typed in.

With a table, each skill row gets a **Pts** field (and a **Diff** dropdown when `skillDifficulties` has entries). A skill with points gets:

**level = its attribute + the difficulty's `base` + the `level` of the last `skillCosts` row whose `pts` ≤ the points**

- Points below the first row's `pts` give no level (the skill shows "—").
- `skillCostEach`: past the last row, every `pts` more points add `level` more.
- A skill whose Pts field is empty keeps its typed level, so sheets the LLM writes (levels only) still work.

```json
"skillCosts": [ { "pts": 1, "level": 0 }, { "pts": 2, "level": 1 }, { "pts": 4, "level": 2 } ],
"skillCostEach": { "pts": 4, "level": 1 },
"skillDifficulties": [ { "name": "Easy", "base": 0 }, { "name": "Hard", "base": -2 } ]
```
→ Dex 12, 8 points in a Hard skill: 12 − 2 + 3 = 13.

### `categorySkills` (list of `{ category, skill }`)
The skill an item of that category uses when its *skill* field is empty (or names a skill the sheet doesn't have) and no skill is named like the item. Example: `[ { "category": "buckler", "skill": "Buckler Use" } ]`.

### `itemPresets` (list of `{ name, category, qty, effect, blocks }`)
Your rule set's **New item** buttons in the inventory. `name` is the button's label only: the new item has no name until the user types one, and an item without a name isn't used or sent anywhere. `category` (a label only, it changes nothing), `qty` and `effect` are copied onto the item. `blocks` are the item's blocks (see *Items* below). A block with an unknown `type` is dropped. Fields left out get the defaults listed there.

```json
"itemPresets": [
  { "name": "Melee weapon", "category": "weapon", "blocks": [
    { "type": "attack", "label": "Swing", "use": "melee", "damage": "sw+0 cut" },
    { "type": "attack", "label": "Thrust", "use": "melee", "damage": "thr+0 imp" } ] },
  { "name": "Weapon", "category": "weapon", "blocks": [
    { "type": "attack", "roll": "fixed", "level": "floor((Str-10)/2)+Prof", "use": "melee", "damage": "1d8+[floor((Str-10)/2)]" } ] },
  { "name": "Shield", "category": "shield", "blocks": [
    { "type": "defense", "kind": "block", "value": 1 },
    { "type": "modifier", "target": "dodge", "amount": 1, "when": "equipped" } ] },
  { "name": "Breastplate", "category": "armor", "blocks": [
    { "type": "defense", "kind": "armor", "value": 4, "slots": "torso" } ] }
]
```

### Items: blocks
Every item is made of blocks. Each block is optional and can be repeated. Item fields: `name`, `qty` (default 1; 0 = not carried), `weight`, `value`, `category` (label only), `equipped` (default true), `effect` (text for the LLM; macros allowed), `blocks`.

| Block `type` | Fields (default) |
|---|---|
| `attack` | `label`; `roll`: `skill` (default) or `fixed`; `skill`: a skill name, an attribute key or a secondary key; `level`: number or formula, used with `roll: "fixed"`; `damage`: damage text (grammar below; `sw` / `thr` from `damageTable`; `[formula]` parts are worked out from the character, e.g. `1d8+[floor((Str-10)/2)]`); `use`: `melee` (default), `ranged` or `utility`; `range`: yards (for melee: reach, default 1); `hits`: `roll` (default) or `auto` (always hits, no roll or defense). Counts while the item is carried. |
| `defense` | `kind`: `armor` (default) or `block`. For `armor`: `value` = armor points, `slots` = where it is worn, a comma list (`"torso, arms"`; empty or `all` = everywhere). For `block`: `value` = bonus added to the Block, `skill` = what it rolls with (as for `attack`). Counts only while the item is equipped. |
| `modifier` | `amount`: a number; `target`: `item:attack`, `item:damage`, `item:both`, `item:armor`, `item:block` (this item only), `attack`, `damage`, `armor`, `dodge`, `parry`, `block`, `armorClass` (everything), `attr:<attribute key>`, `sec:<secondary key>`, `skill:<skill name>`; `when`: `equipped` (default), `carried` or `always`. |
| `ability` | The ability fields listed under *Abilities* below, plus `roll`: `fixed` (default) or `skill`, and `level` (number or formula, used with `roll: "fixed"`). `resource: "charges:<name>"` pays the cost from this item's `charges` block of that name. Counts while the item is equipped. |
| `charges` | `name` (default `Charges`); `left` (empty = unlimited); `max`. |
| `consumes` | `from`: `item` (default) or `pool`; `item`: the name of another inventory item (arrows…); `pool`: a resource name (FP, mana, HP…); `per`: amount used per attack (default 1). An attack whose ammo has run out is not offered. |

### `macros` (list of definitions): home-brew macros
What a `{{name}}` written in trait or item text does, for example `{{haste}}` (actions doubled) or `{{immunity cold}}` (immune to attacks with the keyword `cold`). The sheet only finds the macros and sends them, with these definitions, to Roll Dice. **Combat Mode applies them.** The fields (`name`, `aliases`, `params`, `defaults`, `text`, `actions`, `actionsTimes`, `immune`, `damageTaken`, `mods`, `only`, `phase`, `body`, `pools`, and the attack fields `area`, `frag`, `push`, `scale`, `deliver`…) are described in NPC-Book-Combat/RULES.md → `macros`. A definition in Combat's rules pack with the same name wins over one here.

Entries are stored as written. Only entries without a valid `name` (a letter first, then letters, digits and `-`) are dropped. When there are definitions, the LLM is told it may put them in a new character's trait notes.
```json
"macros": [
  { "name": "haste", "params": ["times"], "defaults": { "times": "2" }, "text": "actions x{times}", "actionsTimes": "{TIMES}" },
  { "name": "immunity", "params": ["keyword"], "text": "immune to {keyword}", "immune": ["{keyword}"] }
]
```

### `sheetXml` (`{ stats, level, cost }`)
- `stats`: lines of `{ tag, of }`. `tag` is the XML name the LLM sees and must be key-like. `of` is an attribute key, a secondary key or `lift`. Secondary stats you don't list go on one extra line. If there are no lines and no secondary stats, no `<stats>` block is sent.
- `level`: renames the `level="…"` attribute on skills and abilities. Default `level`.
- `cost`: renames an ability's `cost="…"` attribute. Default `cost`.

---

## What is fixed in the code (not configurable)

- **Skill levels** are typed in, unless the rules have a `skillCosts` table (see above). Without one, a skill's *Attr* dropdown is a label only.
- **What counts as a weapon:** an item with an `attack` block. The category changes nothing.
- **An item's level** (attack or block): with `roll: "fixed"`, the block's `level`. Otherwise the block's `skill` if it is an attribute or secondary key; else the first skill on the sheet that matches, in this order: the block's `skill`; a skill named exactly like the item; `categorySkills` for its category; a skill named like a word of its category; a skill named like a word of its name ("Kite Shield" → "Shield"). With no match it uses `unskilled`.
- **Damage grammar** (attack block `damage` and ability `damage`):
  - `thr` / `thrust` / `sw` / `swing` / `NdM`, then optional `±N` terms and extra dice of other sizes, then one type word: `sw+1 cut`, `thr-1 cr`, `2d+1 pi+`, `1d8+2d6+3 fire`. A subtracted dice term (`-1d6`) is ignored.
  - A plain number is flat damage: `5`, `3 fire`.
  - An armor divisor in brackets after the type, `2d cut (2)` or `1d pi (0.5)`, is sent with the damage as `div` (Combat Mode uses it when `armorDivisors` is on).
  - The type word is any lower-case letters, `+` or `-` (`pi++`, `pi-`). Only the first type word is read.
- **Abilities**: these fields are set on the sheet, not in the rules.
  - `use` is ranged, melee or utility.
  - `fx` is damage, heal, fp, buff, debuff, stun, disarm, haste, poison, bleed or none.
  - `aim` is enemy, ally, self or any.
  - `stat` is attack, defense, skill, resist, dr, move or all.
  - The other fields are `name`, `kind`, `skill`, `damage`, `range`, `effect`, `duration` (turns; default 3, or 1 for stun), `mod` (0 or empty = +2 for buff, −2 for debuff, 1 for haste), `resist` (an attribute or secondary key), `dc`, `save` (none or half), `castTime`, `hits` (roll or auto), `defendWith`, `cost` and `resource`.
  - The ability's level: a *skill* field that is an attribute or secondary key gives that value; one that names a skill on the sheet gives its level; one that names anything else gives `unskilled`. Only an empty *skill* field tries a skill named like the ability first, then `unskilled`.
- **Macros** in trait, item or ability text: `{{name}}`, `{{name arg}}`, `{{name arg1 arg2}}`, `{{name:arg}}`, `{{name=arg}}` or `{{name a, b}}`. Searched: a trait's name and effect; an item's name and effect; an ability's (or ability block's) name, kind and effect. A macro is sent with `from` = the trait, item or ability it was written on, so its attack fields apply to that attack or ability. What they do comes from `macros` (above) and Combat Mode's rules pack; only `{{extra-turn}}` / `{{extra-turn:N}}` is built in.

---

## What other extensions receive

The sheet registers with Roll Dice. For each enabled sheet it sends:
`{ key, name, rollables, combat, dr, hp (health role), fp (stamina role), move, speed (speed role), ac, attrs (every attribute, every secondary stat and lift, under their keys), resources, macros ([{ name, arg, args, from }]), macroDefs (the rules' macros), armor ([{ name, dr, covers }]: each armor `defense` block of an equipped item, with its `slots`) }`.
Combat Mode finds attributes by these **keys**. For Combat's free-form checks and resistance rolls (strength, agility, will…), the Roll Dice game system pack has to name your keys under `stats`. See RollDice/RULES.md.

---

## Complete example

Here is a small config:

```json
{
  "name": "Example Rules",
  "attributes": [ { "key": "Str", "label": "Strength" }, { "key": "Agi", "label": "Agility" } ],
  "attrBase": 10,
  "secondary": [
    { "key": "Health", "label": "Health", "base": "Str", "step": 1 },
    { "key": "Stamina", "label": "Stamina", "base": "Str", "step": 1 },
    { "key": "Speed", "label": "Speed", "base": "(Agi + Str) / 4", "step": 0.25 },
    { "key": "Move", "label": "Move", "base": "floor(Speed)", "step": 1 }
  ],
  "roles": { "damage": "Str", "defaultAttr": "Agi", "health": "Health", "stamina": "Stamina", "speed": "Speed", "move": "Move" },
  "basicLift": "Str * 2", "liftUnit": "kg",
  "damageTable": [ { "at": 1, "thrust": "1d-2", "swing": "1d-1" }, { "at": 12, "thrust": "1d", "swing": "1d+2" } ],
  "encumbrance": [ { "name": "Light", "load": 2, "move": 1, "dodge": 0 }, { "name": "Heavy", "load": 5, "move": 0.5, "dodge": -2 } ],
  "dodge": "floor(Speed) + 3", "parry": "floor(skill / 2) + 3", "block": "floor(skill / 2) + 3",
  "unskilled": "Agi - 4",
  "unarmedAttacks": [ { "name": "Punch", "levelMod": 0, "damage": "thr-1 blunt" } ],
  "woundMultipliers": { "blunt": 1, "edge": 1.5 }, "defaultDamageType": "blunt",
  "sheetXml": { "stats": [ [ { "tag": "STR", "of": "Str" }, { "tag": "AGI", "of": "Agi" } ] ] }
}
```

## Buttons

The **Rules templates** block works the same in Roll Dice, NPC Book - Character Sheet and NPC Book - Combat Mode:

- **Dropdown**: your templates and the built-in ones. Picking one puts it in use at once.
- **New** / **Duplicate** / **Rename** / **Delete** (the icons next to it): New and Duplicate ask for a name and make the new template the one in use. The name is never read from the JSON. Built-in templates can't be renamed, deleted or edited: use **Duplicate to edit**.
- **The box**: the rules of the picked template. Problems are listed under it.
- **Save** (bottom right) writes the box back into the picked template and puts it in use. **Revert** throws your changes away. Switching to another template with unsaved changes asks first.
- **Import** makes a new template from a `.json` file (named after the file). **Export** downloads the box as `.json`.

Formula syntax problems are listed under the box. The built-in **None (no rules)** is `{}`: the sheet only adds up what you type in.
