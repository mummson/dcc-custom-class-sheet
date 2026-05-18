// DCC Custom Class Sheet — sheet subclass that adds a "Custom Class" tab
//
// Strategy
// - Resolve DCCActorSheetGeneric at init time from CONFIG.Actor.sheetClasses (populated by the
//   DCC system's init hook, which fires before any module init hooks).
//   This avoids a direct cross-module import — Foundry v14 blocks those with a MIME type error.
// - CLASS_PARTS overrides the tabs template and adds our custom-class panel.
//   All other PARTS are inherited from DCCActorSheetGeneric via the prototype chain.
// - Tab label comes only from a (CUSTOMCLASS)Name skill present on the actor.
//
// Dependencies: init.js (constants), utils.js (parsers & helpers), class-builder.js (builder dialog)

import { MODULE_ID } from "./init.js";
import {
  groupActorSkills,
  getCustomClassLabel,
  getCustomClassIcon,
  postSkillToChat,
} from "./utils.js";
import { CustomClassBuilder } from "./class-builder.js";

const TAB_ID = "dccCustomClass";
const REGISTER_TYPE = "Player";

console.log(`[${MODULE_ID}] custom-sheet.js: module evaluating`);

Hooks.once("init", () => {
  console.log(`[${MODULE_ID}] custom-sheet.js: init hook fired`);

  try {
    // DCC system registers its sheets during its own init hook, which runs before module init hooks
    const BaseClass = CONFIG.Actor.sheetClasses?.Player?.["dcc.DCCActorSheetGeneric"]?.cls;
    if (!BaseClass) {
      console.error(`[${MODULE_ID}] DCCActorSheetGeneric not found in CONFIG.Actor.sheetClasses.Player — aborting`);
      return;
    }

    class DCCActorSheetCustom extends BaseClass {
      // Override the tabs template and add our custom-class panel.
      // Merges over inherited PARTS via _configureRenderParts in the DCC base class.
      static CLASS_PARTS = {
        tabs: {
          id: "tabs",
          template: `modules/${MODULE_ID}/templates/tabs-with-icons.html`
        },
        customClass: {
          id: "customClass",
          template: `modules/${MODULE_ID}/templates/custom-class.html`
        }
      }

      static CLASS_TABS = {
        sheet: {
          tabs: [
            {
              id: "customClass",
              group: "sheet",
              label: "DCCCS.TabLabel",
              icon: "fa-solid fa-circle-exclamation"
            }
          ]
        }
      }

      static DEFAULT_OPTIONS = {
        classes: ["dcc-custom-class-sheet"],
      }

      /** @inheritdoc */
      _getTabsConfig(group) {
        const tabs = super._getTabsConfig(group);
        if (group !== "sheet") return tabs;

        const customTab = tabs.tabs?.find(t => t.id === "customClass");
        if (customTab) {
          const label = getCustomClassLabel(this.actor);
          const icon = getCustomClassIcon(this.actor);
          customTab.label = label || game.i18n?.localize?.("DCCCS.TabLabel") || "Custom Class";
          customTab.icon = icon;
        }

        return tabs;
      }

      /** @inheritdoc */
      async _prepareContext(options) {
        const context = await super._prepareContext(options);

        const label = getCustomClassLabel(this.actor) || game.i18n?.localize?.("DCCCS.TabLabel") || "Custom Class";

        const { grouped, occupational } = groupActorSkills(this.actor);

        const classLabel = getCustomClassLabel(this.actor);
        const sortedGroupNames = Object.keys(grouped).sort((a, b) => {
          if (classLabel) {
            const aMatches = a.toLowerCase() === classLabel.toLowerCase();
            const bMatches = b.toLowerCase() === classLabel.toLowerCase();
            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;
          }
          return a.localeCompare(b, undefined, { sensitivity: "base" });
        });

        const { TextEditor } = foundry.applications.ux;

        const groupsData = [];
        for (const className of sortedGroupNames) {
          const skillWrappers = [];
          for (const { item, parsed } of grouped[className]) {
            const descriptionHTML = item.system?.description?.value || "";
            const enrichedDesc = await TextEditor.enrichHTML(descriptionHTML, {
              relativeTo: item,
              secrets: this.actor.isOwner
            });
            skillWrappers.push({
              item,
              displayName: parsed.skillName,
              tooltipContent: `<h3>${parsed.skillName}</h3>${enrichedDesc}`
            });
          }
          groupsData.push({ className, skills: skillWrappers });
        }

        if (occupational.length > 0) {
          const occupationalWrappers = [];
          for (const item of occupational) {
            const descriptionHTML = item.system?.description?.value || "";
            const enrichedDesc = await TextEditor.enrichHTML(descriptionHTML, {
              relativeTo: item,
              secrets: this.actor.isOwner
            });
            occupationalWrappers.push({
              item,
              displayName: item.name,
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

        this.__dcccsViewModel = vm;
        return { ...context, tabId: TAB_ID, ...vm };
      }

      /** @inheritdoc */
      _onRender(context, options) {
        super._onRender(context, options);

        const tabPanel = this.element.querySelector(`section[data-tab="customClass"]`);
        if (!tabPanel) {
          console.warn(`[${MODULE_ID}] Custom class tab panel not found`);
          return;
        }

        tabPanel.addEventListener("click", async (ev) => {
          const btn = ev.target.closest?.('[data-action="launchBuilder"]');
          if (!btn) return;
          ev.preventDefault();
          ev.stopPropagation();
          new CustomClassBuilder(this.actor).render(true);
        });

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

          const groups = this.__dcccsViewModel?.groups || [];
          let displayName = item.name;
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

    const { Actors } = foundry.documents.collections;
    Actors.registerSheet(MODULE_ID, DCCActorSheetCustom, {
      types: [REGISTER_TYPE],
      label: "Custom Class",
      makeDefault: false
    });
    console.log(`[${MODULE_ID}] registerSheet ok → scope=${MODULE_ID}, type=${REGISTER_TYPE}`);

  } catch (e) {
    console.error(`[${MODULE_ID}] init failed`, e);
  }
});
