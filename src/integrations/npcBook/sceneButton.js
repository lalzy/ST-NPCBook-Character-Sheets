// The sheet button in NPC Book's scene bar: toggles sheet generation for this chat.
import { TITLE } from '../../core/constants.js';
import { settings } from '../../core/context.js';
import { chatChoice, generateInChat, setChatChoice } from '../../chat/generation.js';

export const sceneButton = {
    icon: () => 'fa-users-viewfinder',
    active: () => generateInChat(),
    title: () => {
        const on = generateInChat();
        const src = chatChoice() === undefined ? 'default from Settings' : 'this chat';
        return `Character sheets for new NPCs: ${on ? 'ON' : 'OFF'} (${src}). Click to turn ${on ? 'off' : 'on'} for this chat.`;
    },
    onClick: () => {
        if (!settings().enabled) { toastr.info(`${TITLE} is disabled in Extensions settings.`, TITLE); return; }
        setChatChoice(!generateInChat());
        toastr.info(`Character sheets for new NPCs in this chat: ${generateInChat() ? 'ON' : 'OFF'}`, TITLE);
    },
};
