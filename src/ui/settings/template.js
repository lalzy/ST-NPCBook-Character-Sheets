// Markup for the Extensions settings drawer.


export const settingsHtml = () => `
    <div class="npcb-sheet-settings">
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b><i class="fa-solid fa-users-viewfinder"></i> NPC Book - Character Sheet</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <small>A character sheet for NPC Book, for any game system.</small>
          <label class="checkbox_label"><input type="checkbox" id="gs_enabled"> Enabled</label>
          <label class="checkbox_label"><input type="checkbox" id="gs_send"> Send sheet XML (stats, traits, skills, equipment, reaction modifiers) inside each &lt;char&gt; / &lt;user&gt;</label>
          <label class="checkbox_label"><input type="checkbox" id="gs_gen"> Generate sheets for new NPCs by default</label>
          <small>Chats follow this until you click the <i class="fa-solid fa-users-viewfinder"></i> button in NPC Book's scene bar, which turns it on or off for that chat only. Off: the LLM is not asked for a sheet, and any sheet it writes anyway is ignored.</small>
          <div class="gs-chatrow"><span id="gs_chatstate" class="gs-dim"></span> <button class="menu_button" id="gs_chatreset">Use default in this chat</button></div>
          <small>Open an NPC card (NPC Book top-bar button) → <b>Sheet</b> tab. Your own sheet: click your card in the scene bar → <b>Character sheet</b>. Each character's sheet has its own <b>Enable sheet</b> switch (off by default); only enabled sheets are sent. Untouched sheets are never sent.</small>

          <div id="gs_rules_tpl"></div>
        </div>
      </div>
    </div>`;
