// Thin wrapper around the optional Roll Dice extension.

/** The Roll Dice API, or null when it isn't installed. */
export const rollDice = () => (window.RollDice?.open ? window.RollDice : null);

/** Open Roll Dice prefilled for one stat/skill of a character. Dice and comparison come from Roll Dice's own presets. */
export function rollFromSheet(sheet, prefix, name, target, characterKey, preset = 'skill') {
    const rd = rollDice();
    if (!rd) return;
    rd.open({ preset, skill: `${prefix ? `${prefix} ` : ''}${name}`, target: String(target), character: characterKey, rollable: name });
}
