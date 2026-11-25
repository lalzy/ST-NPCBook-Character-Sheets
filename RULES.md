# Writing a rules config

This guide shows you how to fill in the **Rules** box (Extensions → NPC Book Character Sheet → Rules), one part at a time.

All the numbers here come from an **invented example game**, so you can see how each part works. They are not the rules of any real game. When you write your own config, use the numbers from your own rulebook.

You don't need to fill in everything. Start with steps 1 to 3, click **Save rules**, open a sheet and look at it. Then add more. Anything you leave out is just not calculated, and the sheet shows "—" for it.

---

## How the box works

The box takes **JSON**: a list of `"name": value` pairs inside `{ }`. Three rules keep it valid:

- Text goes in double quotes: `"Health"`. Numbers don't: `5`.
- Put a comma between items, but not after the last one.
- Lists use `[ ]`, groups use `{ }`.

When you click **Save rules**, you see "Saved." or a message saying what's wrong. **Blank template** fills the box with every key and no values, so you only need to type in the numbers.

A smallest working config looks like this:

```json
{
  "name": "Example Rules",
  "attributes": [ { "key": "Str", "label": "Strength" } ],
  "attrBase": 8
}
```

---

## Step 1: Name and attributes

```json
"name": "Example Rules",
"attributes": [
  { "key": "Str", "label": "Strength" },
  { "key": "Agi", "label": "Agility" },
  { "key": "Mind", "label": "Mind" },
  { "key": "Body", "label": "Body" }
],
"attrBase": 8,
```

- `name` is shown at the top of every sheet.
- `attributes` are the main stats of your game. The sheet has no attributes until you list them. `key` is a short name with no spaces (formulas and skills use it), `label` is what the sheet shows.
- `attrBase` is the value a new character starts with in every attribute. In the example game an average person has 8.

## Step 2: What attributes cost

```json
"attrCost": { "Str": 5, "Agi": 5, "Mind": 5, "Body": 5 },
```

The number of points for each level above `attrBase`. Levels below it give points back.

> Example: Str 10 is 2 above 8, so it costs 2 × 5 = **10 points**. Str 7 gives back **5 points**.

Leave `attrCost` out and attributes cost nothing.

## Step 3: Secondary stats

These are values worked out from the attributes, like health or speed. Each one is a row in a list:

```json
"secondary": [
  { "key": "Health", "label": "Health", "base": "Str + Body", "cost": 2, "step": 1 },
  { "key": "Stamina", "label": "Stamina", "base": "Body", "cost": 2, "step": 1 },
  { "key": "Resolve", "label": "Resolve", "base": "Mind", "cost": 3, "step": 1, "roll": "Resolve" },
  { "key": "Awareness", "label": "Awareness", "base": "Mind", "cost": 3, "step": 1, "roll": "Awareness" },
  { "key": "Speed", "label": "Speed", "base": "(Agi + Body) / 4", "cost": 4, "step": 0.5 },
  { "key": "Move", "label": "Move", "base": "floor(Speed)", "cost": 4, "step": 1 }
],
```

| Field | Meaning |
|---|---|
| `key` | A short name with no spaces. Formulas use it. |
| `label` | What the sheet shows. |
| `base` | A formula for the starting value (see [Formulas](#formulas)). |
| `cost` | Points for each step you raise it. |
| `step` | How much one step changes it. Usually 1. |
| `roll` | Optional. Adds a roll button with this name. |

> Example: Str 10 and Body 9 give Health a base of **19**. Raise it by 2 steps and it becomes **21**, costing 2 × 2 = **4 points**.

**Order matters.** A formula can use any key listed *above* it. That's why `Move` comes after `Speed`.

**Roles.** Some parts of the sheet and Combat Mode need to know which of your keys does what. Tell them in `roles`:

```json
"roles": { "damage": "Str", "defaultAttr": "Agi", "health": "Health", "stamina": "Stamina", "speed": "Speed", "move": "Move" },
```

- `damage`: the attribute the strength damage table reads (step 5).
- `defaultAttr`: the attribute a skill uses when none is given, and for attacks with no matching skill. Left out, the first attribute is used.
- `health`, `stamina`, `speed`, `move`: the secondary keys Combat Mode reads for health, stamina, turn order and movement.

Any role you leave out is not used.

## Step 4: Carrying capacity

```json
"basicLift": "Str * 3",
"liftUnit": "kg",
```

- `basicLift` is a formula for how much a character carries easily. Formulas can use it afterwards under the name `lift`.
- `liftUnit` is shown after lift and item weights.

> Example: Str 10 gives a lift of **30 kg**.

## Step 5: Strength damage (thrust and swing)

Strength damage is given as dice, read from a table by the `damage` attribute in `roles` (Str in the example):

```json
"damageTable": [
  { "at": 1,  "thrust": "1d-3", "swing": "1d-2" },
  { "at": 6,  "thrust": "1d-1", "swing": "1d" },
  { "at": 10, "thrust": "1d",   "swing": "1d+2" },
  { "at": 14, "thrust": "2d-1", "swing": "2d+1" },
  { "at": 18, "thrust": "2d+1", "swing": "3d" }
],
```

The sheet uses the row with the **highest `at` that isn't above** the character's Str. You don't need a row for every Str.

> Example: Str 12 uses the `at: 10` row, so thrust is **1d** and swing is **1d+2**.

Weapons can then use `thr` and `sw` in their damage: a sword with `sw edge` deals swing damage. A character with Str 12 gets **1d+2 edge**.

## Step 6: Skills

Skills have a difficulty, and points buy levels.

```json
"skillDifficulties": [
  { "key": "Easy", "base": 0 },
  { "key": "Hard", "base": -2 }
],
"skillCosts": [
  { "pts": 1, "level": 0 },
  { "pts": 3, "level": 1 },
  { "pts": 6, "level": 2 }
],
"skillCostEach": { "pts": 3, "level": 1 },
```

- `skillDifficulties`: the choices in the sheet's **Diff** column. `base` is added to every skill of that difficulty.
- `skillCosts`: "with at least `pts` points, the skill is at `level`".
- `skillCostEach`: what happens past the last row. Here, every 3 more points add +1.

Skill level = attribute + difficulty base + level from the cost table.

> Example: Lore is a **Hard** Mind skill with **9 points**. The last row (6 pts) gives +2, the 3 extra points add +1, and Hard adds −2. That's Mind **+1**, so with Mind 9 Lore is **10**.

**No cost table?** Then the number you type for a skill is simply its level above the attribute, and skills don't count toward points. That's handy if you just want to write skill levels down.

## Step 7: Encumbrance

How much carried weight slows a character down:

```json
"encumbrance": [
  { "name": "Light",    "load": 2, "move": 1,    "dodge": 0 },
  { "name": "Burdened", "load": 4, "move": 0.5,  "dodge": -1 },
  { "name": "Strained", "load": 6, "move": 0.25, "dodge": -3 }
],
```

- `load`: the highest carried weight for this level, as a multiple of lift.
- `move`: Move is multiplied by this (and rounded down).
- `dodge`: added to Dodge.

Carrying more than the last level is **Overloaded**: Move 0, and the last row's dodge penalty.

> Example: lift 30 kg and carrying 100 kg. The limits are 60 kg for Light and 120 kg for Burdened, so the character is **Burdened**: Move 5 becomes **2**, and Dodge gets −1.

This step needs `basicLift` (step 4).

## Step 8: Defenses

```json
"dodge": "floor(Speed) + 2",
"parry": "floor(skill / 2) + 2",
"block": "floor(skill / 2) + 3",
```

- `dodge` can use attributes, secondary keys and `lift`.
- `parry` and `block` use `skill`: the level of the weapon or shield skill.

> Example: Speed 5 gives Dodge **7**. Sword skill 13 gives Parry floor(6.5) + 2 = **8**.

Leave one out and the sheet doesn't offer that defense.

## Step 9: Untrained attacks and defense bonuses

```json
"unskilled": "Agi - 4",
"defenseTraits": [ { "name": "Alert", "bonus": 1 } ],
```

- `unskilled`: the attack level when a weapon has no matching skill. Leave it out and the `defaultAttr` attribute (Agi in the example) is used.
- `defenseTraits`: a trait whose name **starts with** `name` adds `bonus` to every defense.

> Example: Agi 11 with no sword skill attacks at **7**. A character with the trait "Alert" gets +1 to Dodge, Parry and Block.

## Step 10: Unarmed fighting

```json
"unarmedAttacks": [
  { "name": "Strike", "levelMod": 0,  "damage": "thr-1 blunt" },
  { "name": "Shove",  "levelMod": -1, "damage": "thr-2 blunt" }
],
"unarmedSkills": [
  { "name": "Brawler", "bonus": [ { "over": 3, "perDie": 1 } ] }
],
```

- `unarmedAttacks`: the attacks offered in combat. They roll at the best unarmed skill (or the `defaultAttr` attribute) plus `levelMod`.
- `unarmedSkills`: skills that count as unarmed. `bonus`: when the skill is at least `over` above the `defaultAttr` attribute, add `perDie` damage for each die of thrust.

> Example: Agi 11 and Brawler 14 is 3 over Agi, so it gets +1 per die. Thrust is 1d, so Strike does 1d−1 + 1 = **1d blunt**.

## Step 11: Damage types

```json
"woundMultipliers": { "blunt": 1, "edge": 1.5, "point": 2, "fire": 1 },
"defaultDamageType": "blunt"
```

- `woundMultipliers`: damage that gets through armor is multiplied by this, per damage type word. Types not listed use 1.
- `defaultDamageType`: used when a weapon's damage has no type.

These words are also offered to the AI when it writes new NPCs.

> Example: 6 damage of type `edge` that gets through armor becomes **9** injury.

## Step 12: What the AI is sent

```json
"sheetXml": {
  "stats": [
    [ { "tag": "STR", "of": "Str" }, { "tag": "AGI", "of": "Agi" }, { "tag": "MIND", "of": "Mind" }, { "tag": "BODY", "of": "Body" } ],
    [ { "tag": "Health", "of": "Health" }, { "tag": "Stamina", "of": "Stamina" }, { "tag": "Carry", "of": "lift" } ]
  ],
  "level": "level",
  "relative": "relative",
  "cost": "cost"
}
```

- `stats`: the lines of the `<stats>` block. Each entry is one tag: `tag` is the name the AI sees, `of` is an attribute, a secondary key or `lift`. Secondary stats you don't list are sent on one more line under their key. With no `stats` and no secondary stats, no `<stats>` block is sent.
- `level`, `relative`, `cost`: the names used for a skill's level, its level relative to the attribute, and an ability's cost. Left empty, they are `level`, `relative` and `cost`.

> Example: with the layout above, a character gets `<STR v="10"/><AGI v="11"/><MIND v="9"/><BODY v="9"/>` on the first line.

---

## Formulas

You can use:

- Numbers: `3`, `0.5`
- `+  -  *  /` and brackets `( )`
- `floor(x)` rounds down, `ceil(x)` rounds up, `round(x)` rounds to the nearest whole number
- `min(a, b)`, `max(a, b)`, `abs(x)`
- your attribute keys (`Str`, `Agi`, `Mind`, `Body` in the example), any secondary key listed earlier, and `lift`
- `skill`, but only in `parry` and `block`

Some examples: `Str + Body`, `(Agi + Body) / 4`, `floor(Speed) + 2`, `max(1, floor(Str / 2))`.

If a formula has a mistake, **Save rules** tells you which one, and that value shows "—" until you fix it.

---

## Complete example

This is every step together. Copy it, paste it into the box, click **Save rules**, then change the numbers to your game's.

```json
{
  "name": "Example Rules",
  "attributes": [
    { "key": "Str", "label": "Strength" },
    { "key": "Agi", "label": "Agility" },
    { "key": "Mind", "label": "Mind" },
    { "key": "Body", "label": "Body" }
  ],
  "attrBase": 8,
  "attrCost": { "Str": 5, "Agi": 5, "Mind": 5, "Body": 5 },
  "secondary": [
    { "key": "Health", "label": "Health", "base": "Str + Body", "cost": 2, "step": 1 },
    { "key": "Stamina", "label": "Stamina", "base": "Body", "cost": 2, "step": 1 },
    { "key": "Resolve", "label": "Resolve", "base": "Mind", "cost": 3, "step": 1, "roll": "Resolve" },
    { "key": "Awareness", "label": "Awareness", "base": "Mind", "cost": 3, "step": 1, "roll": "Awareness" },
    { "key": "Speed", "label": "Speed", "base": "(Agi + Body) / 4", "cost": 4, "step": 0.5 },
    { "key": "Move", "label": "Move", "base": "floor(Speed)", "cost": 4, "step": 1 }
  ],
  "roles": { "damage": "Str", "defaultAttr": "Agi", "health": "Health", "stamina": "Stamina", "speed": "Speed", "move": "Move" },
  "basicLift": "Str * 3",
  "liftUnit": "kg",
  "damageTable": [
    { "at": 1, "thrust": "1d-3", "swing": "1d-2" },
    { "at": 6, "thrust": "1d-1", "swing": "1d" },
    { "at": 10, "thrust": "1d", "swing": "1d+2" },
    { "at": 14, "thrust": "2d-1", "swing": "2d+1" },
    { "at": 18, "thrust": "2d+1", "swing": "3d" }
  ],
  "skillDifficulties": [
    { "key": "Easy", "base": 0 },
    { "key": "Hard", "base": -2 }
  ],
  "skillCosts": [
    { "pts": 1, "level": 0 },
    { "pts": 3, "level": 1 },
    { "pts": 6, "level": 2 }
  ],
  "skillCostEach": { "pts": 3, "level": 1 },
  "encumbrance": [
    { "name": "Light", "load": 2, "move": 1, "dodge": 0 },
    { "name": "Burdened", "load": 4, "move": 0.5, "dodge": -1 },
    { "name": "Strained", "load": 6, "move": 0.25, "dodge": -3 }
  ],
  "dodge": "floor(Speed) + 2",
  "parry": "floor(skill / 2) + 2",
  "block": "floor(skill / 2) + 3",
  "unskilled": "Agi - 4",
  "defenseTraits": [ { "name": "Alert", "bonus": 1 } ],
  "unarmedSkills": [ { "name": "Brawler", "bonus": [ { "over": 3, "perDie": 1 } ] } ],
  "unarmedAttacks": [
    { "name": "Strike", "levelMod": 0, "damage": "thr-1 blunt" },
    { "name": "Shove", "levelMod": -1, "damage": "thr-2 blunt" }
  ],
  "woundMultipliers": { "blunt": 1, "edge": 1.5, "point": 2, "fire": 1 },
  "defaultDamageType": "blunt",
  "sheetXml": {
    "stats": [
      [ { "tag": "STR", "of": "Str" }, { "tag": "AGI", "of": "Agi" }, { "tag": "MIND", "of": "Mind" }, { "tag": "BODY", "of": "Body" } ],
      [ { "tag": "Health", "of": "Health" }, { "tag": "Stamina", "of": "Stamina" }, { "tag": "Carry", "of": "lift" } ]
    ],
    "level": "level",
    "relative": "relative",
    "cost": "cost"
  }
}
```

A character with Str 10, Agi 11, Mind 9, Body 9 under these rules gets: Health 19, Speed 5, Move 5, lift 30 kg, thrust 1d, swing 1d+2 and Dodge 7.

---

## Tips

- **Export** saves your config to a file. **Import** loads one. Keep a file for each game you run.
- After saving, reopen a sheet to see the new values.
- Wrong numbers on a sheet? Check the order of `secondary` (step 3) and the `st` values in `damageTable` (step 5) first.
- **Clear** empties the config, and the sheet goes back to plain record-keeping.
