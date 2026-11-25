// Markup for the Extensions settings drawer.
import { esc } from '../../utils/html.js';


export const settingsHtml = (rulesJson) => `
    <div class="npcb-gurps-settings">
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b><i class="fa-solid fa-users-viewfinder"></i> NPC Book Character Sheet</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <small>A character sheet for NPC Book, for use with the GURPS® system.</small>
          <label class="checkbox_label"><input type="checkbox" id="gs_enabled"> Enabled</label>
          <label class="checkbox_label"><input type="checkbox" id="gs_send"> Send sheet XML (stats, traits, skills, equipment, reaction modifiers) inside each &lt;char&gt; / &lt;user&gt;</label>
          <label class="checkbox_label"><input type="checkbox" id="gs_gen"> Generate sheets for new NPCs by default</label>
          <small>Chats follow this until you click the <i class="fa-solid fa-users-viewfinder"></i> button in NPC Book's scene bar, which turns it on or off for that chat only. Off: the LLM is not asked for a sheet, and any sheet it writes anyway is ignored.</small>
          <div class="gs-chatrow"><span id="gs_chatstate" class="gs-dim"></span> <button class="menu_button" id="gs_chatreset">Use default in this chat</button></div>
          <label>Default point budget<input type="number" id="gs_budget" class="text_pole"></label>
          <small>Open an NPC card (NPC Book top-bar button) → <b>Sheet</b> tab. Your own sheet: click your card in the scene bar → <b>Character sheet</b>. Each character's sheet has its own <b>Enable sheet</b> switch (off by default); only enabled sheets are sent. Untouched sheets are never sent.</small>

          <h4>Rules</h4>
          <small>The extension ships with <b>no rules data</b>. Costs, tables and formulas are yours to fill in from your own copy of the rules. Until you do, the sheet only adds up what you type in. See RULES.md for a step-by-step guide. <span id="gs_rules_status" class="gs-dim"></span></small>
          <textarea id="gs_rules" class="text_pole gs-rules" rows="14" spellcheck="false">${esc(rulesJson)}</textarea>
          <div class="gs-chatrow">
            <button class="menu_button" id="gs_rules_save">Save rules</button>
            <button class="menu_button" id="gs_rules_template" title="Fill the box with the keys only (no numbers or formulas)">Blank template</button>
            <button class="menu_button" id="gs_rules_export">Export</button>
            <button class="menu_button" id="gs_rules_import">Import</button>
            <button class="menu_button" id="gs_rules_clear">Clear</button>
            <input type="file" id="gs_rules_file" accept=".json,application/json" hidden>
          </div>
          <div id="gs_rules_msg" class="gs-dim"></div>
        </div>
      </div>
    </div>`;
