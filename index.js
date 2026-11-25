// NPC Book Character Sheet: a sister extension that adds a character sheet
// to NPC Book cards and personas. Every rule number comes from the user's own rules config, which ships empty.
// Entry point: wires settings, the settings panel, Roll Dice and NPC Book together.
import { ctx, settings, applyRules } from './src/core/context.js';
import { onChatChoiceChange } from './src/chat/generation.js';
import { mountSettings, renderChatState } from './src/ui/settings/index.js';
import { initRollDice } from './src/integrations/rollDice/index.js';
import { initNpcBook } from './src/integrations/npcBook/index.js';

jQuery(() => {
    settings();
    applyRules();
    mountSettings();
    onChatChoiceChange(renderChatState);
    initRollDice();
    const { eventSource, eventTypes } = ctx();
    eventSource.on(eventTypes.CHAT_CHANGED, renderChatState);
    initNpcBook();
});
