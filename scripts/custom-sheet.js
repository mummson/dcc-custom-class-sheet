// DCC Custom Class Sheet — sheet subclass that adds a "Custom Class" tab
//
// Strategy
// - Resolve the current system's default Player/character sheet class dynamically.
// - Extend that class, leaving its template & behavior intact.
// - After render, we *insert* one more tab button + panel (our own template) into this sheet instance.
// - We keep logic minimal, per user requirements: no compendium scanning, no auto imports.
// - The tab label comes *only* from a (CUSTOMCLASS)Name skill present on the actor (case-insensitive).
//
// Dependencies: init.js (constants), utils.js (parsers & helpers), class-builder.js (builder dialog)

import { MODULE_ID } from "./init.js";
import {
  groupActorSkills,
  getCustomClassLabel,
  getCustomClassIcon,
  postSkillToChat,
  purgeNamingItems,
} from "./utils.js";
import { CustomClassBuilder } from "./class-builder.js";
// Use the actual DCC base sheet class, same as dcc-crawl-classes does
import { DCCActorSheetGeneric } from "/systems/dcc/module/actor-sheets-dcc.js";


/** A stable key for our tab id & dataset.tab value */
const TAB_ID = "dccCustomClass";

/**
 * Resolve a sane base sheet class from the system's Player registry.
 * Prefer a "Generic" sheet if present; else the first entry; else fallback to ActorSheet.
 * Returns { cls, type: "Player" }.
 */
function resolvePlayerBaseSheet() {
  const reg = CONFIG?.Actor?.sheetClasses ?? {};
  const player = reg["Player"];
  if (player) {
    // Flatten scopes (system, core, module scopes)
    const entries = [];
    for (const scope of Object.values(player)) {
      for (const entry of Object.values(scope)) entries.push(entry);
    }
    // Prefer id/label that hints "Generic"
    let chosen = entries.find(e =>
      /generic/i.test(e?.id ?? "") || /generic/i.test(e?.label ?? "")
    );
    if (!chosen) chosen = entries[0];
    if (chosen?.cls) return { cls: chosen.cls, type: "Player" };
  }
  // Fallback: anything default anywhere
  const regAll = CONFIG?.Actor?.sheetClasses ?? {};
  for (const [type, scopes] of Object.entries(regAll)) {
    for (const scope of Object.values(scopes)) {
      for (const entry of Object.values(scope)) {
        if (entry?.default && entry?.cls) return { cls: entry.cls, type };
      }
    }
  }
  // Last resort
  return { cls: ActorSheet, type: "Player" };
}

// We extend the DCC system's sheet directly
const BaseSheet = DCCActorSheetGeneric;  // PC "Generic" sheet (shows abilities, modern tabs)
const REGISTER_TYPE = "Player";

/**
 * Our sheet: same as base but with an extra tab that we render from our own template.
 */
export class DCCActorSheetCustom extends BaseSheet {
  /** Define a real tab + panel and attach our PART only to that panel (safe if super has no PARTS) */
/**
   * Parts specific to this class
   **/
  static CLASS_PARTS = {
    customClass: {
      id: "customClass",
      template: `modules/${MODULE_ID}/templates/custom-class.html`
    }
  }
/**
   * Tabs specific to this class
   **/
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { 
          id: "customClass", 
          group: "sheet", 
          label: "DCCCS.TabLabel",
          icon: "fa-solid fa-circle-exclamation"
        },
        { 
          id: "effects", 
          group: "sheet", 
          label: "DCC.Effects"
        }
      ]
    }
  }

  static get defaultOptions() {
    const opts = super.defaultOptions;
    // Do not change existing options; we only want to make sure tabs are enabled
    // and our classes are added for styling isolation.
    const merged = foundry.utils.mergeObject(opts, {
      classes: (opts.classes || []).concat(["dcc-custom-class-sheet"]),
    });
    return merged;
  }

  /** @inheritDoc */
  static PARTS = {
    tabs: {
      id: 'tabs',
      template: `modules/${MODULE_ID}/templates/tabs-with-icons.html`
    },
    character: {
      id: 'character',
      template: 'systems/dcc/templates/actor-partial-pc-common.html'
    },
    equipment: {
      id: 'equipment',
      template: 'systems/dcc/templates/actor-partial-pc-equipment.html'
    },
    skills: {
      id: 'skills',
      template: 'systems/dcc/templates/actor-partial-skills.html'
    },
    wizardSpells: {
      id: 'wizardSpells',
      template: 'systems/dcc/templates/actor-partial-wizard-spells.html'
    },
    notes: {
      id: 'notes',
      template: 'systems/dcc/templates/actor-partial-pc-notes.html'
    },
    effects: {
      id: 'effects',
      template: 'systems/dcc/templates/partial-effects.html'
    }
  }

/** @inheritdoc */
  _getTabsConfig(group) {
    const tabs = super._getTabsConfig(group);
    
    // Only modify the 'sheet' group where our custom tab lives
    if (group !== 'sheet') return tabs;
    
    // Find our custom class tab and update its label and icon dynamically
    const customTab = tabs.tabs?.find(t => t.id === "customClass");
    if (customTab) {
      const label = getCustomClassLabel(this.actor);
      const icon = getCustomClassIcon(this.actor);
      customTab.label = label || game.i18n?.localize?.("DCCCS.TabLabel") || "Custom Class";
      customTab.icon = icon;
    }
    
    // Ensure our panel is configured to use our PART
    if (!tabs.panels) tabs.panels = {};
    if (!tabs.panels.customClass) {
      tabs.panels.customClass = { id: "customClass", parts: ["customClass"] };
    }
    
    return tabs;
  }  
  
  /** Register our sheet for Player actors (v13-safe) */
  static register() {
    // v13-safe, non-deprecated namespace
    const { Actors } = foundry.documents.collections;

    try {
      Actors.registerSheet(MODULE_ID, DCCActorSheetCustom, {
        types: [REGISTER_TYPE],  // "Player"
        label: "Custom Class",
        makeDefault: false
      });
      console.log(`[${MODULE_ID}] registerSheet ok → scope=${MODULE_ID}, type=${REGISTER_TYPE}`);
    } catch (e) {
      console.error(`[${MODULE_ID}] registerSheet failed`, e);
    }
  }


  /** Called after data is prepared by the base class. We add our computed context. */
  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Compute the display label (from (CUSTOMCLASS)Name) or fallback
    const label = getCustomClassLabel(this.actor) || game.i18n?.localize?.("DCCCS.TabLabel") || "Custom Class";

    // Build grouped data for prefixed skills and occupational skills
    const { grouped, occupational } = groupActorSkills(this.actor);

    // Sort group names - matching class prefix first, then alphabetically
    const classLabel = getCustomClassLabel(this.actor);
    const sortedGroupNames = Object.keys(grouped).sort((a, b) => {
      // If we have a class label, check for exact matches
      if (classLabel) {
        const aMatches = a.toLowerCase() === classLabel.toLowerCase();
        const bMatches = b.toLowerCase() === classLabel.toLowerCase();
        
        // If one matches and the other doesn't, matching one comes first
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
      }
      
      // Otherwise sort alphabetically (or both match, or neither match)
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });

    // Prepare groups for template - prefixed skills with parsed names
    const groupsData = [];
    for (const className of sortedGroupNames) {
      const skillWrappers = [];
      for (const { item, parsed } of grouped[className]) {
        // Enrich description HTML for tooltip
        const descriptionHTML = item.system?.description?.value || "";
        const enrichedDesc = await TextEditor.enrichHTML(descriptionHTML, {
          relativeTo: item,
          secrets: this.actor.isOwner
        });
        
        skillWrappers.push({
          item: item,
          displayName: parsed.skillName,
          tooltipContent: `<h3>${parsed.skillName}</h3>${enrichedDesc}`
        });
      }
      groupsData.push({
        className: className,
        skills: skillWrappers
      });
    }

    // Add occupational skills group at the end if any exist
    if (occupational.length > 0) {
      const occupationalWrappers = [];
      for (const item of occupational) {
        // Enrich description HTML for tooltip
        const descriptionHTML = item.system?.description?.value || "";
        const enrichedDesc = await TextEditor.enrichHTML(descriptionHTML, {
          relativeTo: item,
          secrets: this.actor.isOwner
        });
        
        occupationalWrappers.push({
          item: item,
          displayName: item.name, // Occupational skills use full name
          tooltipContent: `<h3>${item.name}</h3>${enrichedDesc}`
        });
      }
      groupsData.push({
        className: game.i18n.localize("DCCCS.OccupationalSkills"),
        skills: occupationalWrappers
      });
    }

    const vm = {
      tabLabel: label,
      groups: groupsData,
      hasGroups: groupsData.length > 0,
    };

    // Stash for render time
    this.__dcccsViewModel = vm;

    // Expose our view model at the top-level so the PART template can read it
    return { ...context, tabId: TAB_ID, ...vm };

  }

  /** Standard Foundry lifecycle: after the sheet has rendered its HTML */
  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);

    // Wire our button actions inside the tab
    const tabPanel = this.element.querySelector(`section[data-tab="customClass"]`);
    if (!tabPanel) {
      console.warn(`[${MODULE_ID}] Custom class tab panel not found`);
      return;
    }

    // Launch builder button
    tabPanel.addEventListener("click", async (ev) => {
      const btn = ev.target.closest?.('[data-action="launchBuilder"]');
      if (!btn) return;
      
      ev.preventDefault();
      ev.stopPropagation();
      
      // Open the Custom Class Builder dialog
      new CustomClassBuilder(this.actor).render(true);
    });

    // Post skill to chat
    tabPanel.addEventListener("click", async (ev) => {
      const btn = ev.target.closest?.('[data-action="postSkillToChat"]');
      if (!btn) return;
      
      ev.preventDefault();
      ev.stopPropagation();
      
      const itemId = btn.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (!item) {
        console.warn(`[${MODULE_ID}] Item not found:`, itemId);
        return;
      }
      
      // Find the skill wrapper to get displayName
      const groups = this.__dcccsViewModel?.groups || [];
      let displayName = item.name; // fallback
      
      for (const group of groups) {
        const skillWrapper = group.skills.find(s => s.item._id === itemId);
        if (skillWrapper) {
          displayName = skillWrapper.displayName;
          break;
        }
      }
      
      await postSkillToChat(item, displayName);
    });
  }
}

// Register our sheet when the game is ready (sheet registry is loaded by then)
Hooks.once("init", () => {
  DCCActorSheetCustom.register();
});