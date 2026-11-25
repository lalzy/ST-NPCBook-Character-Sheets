# Rules config

Go to **Extensions → NPC Book Character Sheet → Rules**. Paste JSON into the box and click **Save rules**.

Every key is optional. If you leave a key out, nothing is calculated for it and the sheet shows "—". **Blank template** fills the box with every key and no values.

The examples below all use one sample character: **Str 10, Agi 11, Mind 9, Body 9**.

---

## Attributes

**`name`** is shown at the top of every sheet.
```json
"name": "Example Rules"
```

**`attributes`** lists the main stats. `key` is the name used in formulas, and `label` is what the sheet shows.
```json
"attributes": [ { "key": "Str", "label": "Strength" }, { "key": "Agi", "label": "Agility" },
                { "key": "Mind", "label": "Mind" }, { "key": "Body", "label": "Body" } ]
```
→ The sheet has the attributes Str, Agi, Mind and Body.

**`attrBase`** is the value a new character starts with.
```json
"attrBase": 8
```
→ A new character has Str 8, Agi 8, Mind 8 and Body 8.

**`attrCost`** is the points each level above `attrBase` costs. Levels below it give points back.
```json
"attrCost": { "Str": 5, "Agi": 5, "Mind": 5, "Body": 5 }
```
→ Str 10 costs 10 points. Str 7 gives back 5 points.

## Secondary stats

**`secondary`** holds stats worked out from other stats. A formula can only use keys listed above it.
```json
"secondary": [
  { "key": "Health", "label": "Health", "base": "Str + Body", "cost": 2, "step": 1 },
  { "key": "Speed",  "label": "Speed",  "base": "(Agi + Body) / 4", "cost": 4, "step": 0.5 },
  { "key": "Move",   "label": "Move",   "base": "floor(Speed)", "cost": 4, "step": 1 },
  { "key": "Resolve","label": "Resolve","base": "Mind", "cost": 3, "step": 1, "roll": "Resolve" }
]
```
→ The sample character gets Health 19, Speed 5 and Move 5. Raising Health 2 steps makes it 21 and costs 4 points. `roll` adds a roll button.

## Roles

**`roles`** tells the sheet and Combat Mode which of your keys does what.
```json
"roles": { "damage": "Str", "defaultAttr": "Agi", "health": "Health", "stamina": "Stamina", "speed": "Speed", "move": "Move" }
```
→ The `damage` attribute reads the damage table. `defaultAttr` is used for skills and attacks that have no attribute. Combat Mode uses `health`, `stamina`, `speed` and `move`.

## Carrying

**`basicLift`** is a formula for carry capacity. Other formulas can use it as `lift`. **`liftUnit`** is the unit shown after weights.
```json
"basicLift": "Str * 3", "liftUnit": "kg"
```
→ Lift is 30 kg.

**`encumbrance`** sets the load levels. `load` is a multiple of lift, `move` multiplies Move, and `dodge` is added to Dodge.
```json
"encumbrance": [ { "name": "Light", "load": 2, "move": 1, "dodge": 0 },
                 { "name": "Burdened", "load": 4, "move": 0.5, "dodge": -1 } ]
```
→ Carrying 100 kg makes the character Burdened: Move 5 becomes 2 and Dodge gets −1. Carrying more than the last row means Overloaded, with Move 0.

## Strength damage

**`damageTable`** sets damage dice. The sheet uses the row with the highest `at` that is not above the `damage` attribute.
```json
"damageTable": [ { "at": 6, "thrust": "1d-1", "swing": "1d" },
                 { "at": 10, "thrust": "1d", "swing": "1d+2" } ]
```
→ Str 12 gives thrust 1d and swing 1d+2. A weapon with damage `sw edge` deals 1d+2 edge.

## Skills

**`skillDifficulties`** sets the choices in the Diff column. `base` is added to the skill level.
```json
"skillDifficulties": [ { "key": "Easy", "base": 0 }, { "key": "Hard", "base": -2 } ]
```

**`skillCosts`** and **`skillCostEach`** set how points buy levels. A row means "at least `pts` points gives `level`". `skillCostEach` applies past the last row.
```json
"skillCosts": [ { "pts": 1, "level": 0 }, { "pts": 3, "level": 1 }, { "pts": 6, "level": 2 } ],
"skillCostEach": { "pts": 3, "level": 1 }
```
→ A Hard Mind skill with 9 points is Mind + 2 + 1 − 2 = **10**.
With no `skillCosts`, the number you type is the level above the attribute, and skills cost no points.

## Defenses

**`dodge`**, **`parry`** and **`block`** are formulas. Parry and block can use `skill`.
```json
"dodge": "floor(Speed) + 2", "parry": "floor(skill / 2) + 2", "block": "floor(skill / 2) + 3"
```
→ Dodge is 7. A weapon skill of 13 gives Parry 8.

**`defenseTraits`** gives a bonus to every defense to traits whose names start with `name`.
```json
"defenseTraits": [ { "name": "Alert", "bonus": 1 } ]
```
→ A character with the trait Alert gets +1 to Dodge, Parry and Block.

## Attacks

**`unskilled`** is the attack level when no skill matches the weapon.
```json
"unskilled": "Agi - 4"
```
→ The sample character attacks at 7.

**`unarmedAttacks`** lists unarmed attacks. Each rolls at the best unarmed skill plus `levelMod`.
```json
"unarmedAttacks": [ { "name": "Strike", "levelMod": 0, "damage": "thr-1 blunt" } ]
```
→ Strike does 1d−1 blunt.

**`unarmedSkills`** lists the skills that count as unarmed. Once the skill is at least `over` above `defaultAttr`, it adds `perDie` damage per die.
```json
"unarmedSkills": [ { "name": "Brawler", "bonus": [ { "over": 3, "perDie": 1 } ] } ]
```
→ Brawler 14 with Agi 11 makes Strike do 1d blunt.

## Damage types

**`woundMultipliers`** multiplies damage that gets through armor, per damage type. **`defaultDamageType`** applies when a weapon's damage has no type.
```json
"woundMultipliers": { "blunt": 1, "edge": 1.5, "point": 2 }, "defaultDamageType": "blunt"
```
→ 6 edge damage through armor becomes 9 injury.

## What the AI is sent

**`sheetXml.stats`** sets the lines of the `<stats>` block. `tag` is the name the AI sees, and `of` is an attribute, a secondary key or `lift`.
```json
"sheetXml": { "stats": [ [ { "tag": "STR", "of": "Str" }, { "tag": "AGI", "of": "Agi" } ],
                         [ { "tag": "Health", "of": "Health" }, { "tag": "Carry", "of": "lift" } ] ] }
```
→ With the secondary stats above, the AI gets the following. Secondary stats you didn't list go on one extra line.
```xml
<stats>
  <STR v="10"/><AGI v="11"/>
  <Health v="19"/><Carry v="30"/>
  <Speed v="5"/><Move v="5"/><Resolve v="9"/>
</stats>
```
If there are no stats at all, no `<stats>` block is sent.

**`sheetXml.level`**, **`relative`** and **`cost`** rename the skill level tag, the relative level tag and the ability cost tag. They default to `level`, `relative` and `cost`.

---

## Formulas

- Numbers and `+ - * / ( )`
- `floor` `ceil` `round` `min` `max` `abs`
- Attribute keys, secondary keys listed above the formula, and `lift`
- `skill`, but only in `parry` and `block`

If a formula is wrong, **Save rules** says which one.

---

## Complete example

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

---

## Buttons

- **Save rules**: checks the config and saves it.
- **Blank template**: fills the box with every key and no values.
- **Export** / **Import**: saves the config to a file or loads it from one.
- **Clear**: empties the config.
