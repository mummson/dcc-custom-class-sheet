// DCC Custom Class Sheet — Class Builder Dialog (V2 API)
// Provides a 3-step wizard for creating custom classes

import { MODULE_ID } from "./init.js";
import { parseCustomClassIcon } from "./utils.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Three-step wizard for creating custom classes:
 * 1. Basics: Class name + icon
 * 2. Skills: Add/edit/remove skills
 * 3. Preview: Review before creation
 */
export class CustomClassBuilder extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    
    // State management
    this.step = 1; // Current wizard step (1-3)
    this.className = "";
    this.iconClass = "fa-circle-exclamation"; // Default icon
    this.skills = []; // Array of {id, name, description, weight}
    this.parentFolder = null; // Optional parent folder
    this.nextSkillId = 1; // For temporary IDs before creation
  }

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-builder`,
    classes: [MODULE_ID, "dcc-class-builder"],
    tag: "form",
    window: {
      title: "DCCCS.Builder.Title",
      resizable: true
    },
    position: {
      width: 640,
      height: 680
    },
    actions: {
      nextStep: CustomClassBuilder.prototype._nextStep,
      prevStep: CustomClassBuilder.prototype._prevStep,
      createClass: CustomClassBuilder.prototype._createClass,
      addSkill: CustomClassBuilder.prototype._addSkill,
      removeSkill: CustomClassBuilder.prototype._removeSkill,
      moveSkillUp: CustomClassBuilder.prototype._moveSkillUp,
      moveSkillDown: CustomClassBuilder.prototype._moveSkillDown
    },
    form: {
      handler: CustomClassBuilder.prototype._handleFormSubmit,
      submitOnChange: false,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/class-builder.html`
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    // Common icons for quick selection
    const commonIcons = [
      { class: "fa-axe-battle", label: "Axe (Barbarian)" },
      { class: "fa-hand-fist", label: "Fist (Monk)" },
      { class: "fa-bow-arrow", label: "Bow (Ranger)" },
      { class: "fa-shield-cross", label: "Shield (Paladin)" },
      { class: "fa-hat-wizard", label: "Hat (Wizard)" },
      { class: "fa-mask", label: "Mask (Rogue)" },
      { class: "fa-cross", label: "Cross (Cleric)" },
      { class: "fa-leaf", label: "Leaf (Druid)" },
      { class: "fa-music", label: "Music (Bard)" },
      { class: "fa-skull", label: "Skull (Necromancer)" },
      { class: "fa-flask", label: "Flask (Alchemist)" },
      { class: "fa-droplet", label: "Droplet (Blood Mage)" },
      { class: "fa-fire", label: "Fire (Pyromancer)" },
      { class: "fa-book-sparkles", label: "Book (Scholar)" },
      { class: "fa-paw", label: "Paw (Beastmaster)" }
    ];

    // Get all world item folders for parent selection
    const itemFolders = game.folders.filter(f => f.type === "Item");
    
    // Sort skills by weight (desc) then name (asc)
    const sortedSkills = [...this.skills].sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.name.localeCompare(b.name);
    });

    return {
      ...context,
      step: this.step,
      className: this.className,
      iconClass: this.iconClass,
      customIconMode: !commonIcons.find(i => i.class === this.iconClass),
      skills: this.skills,
      sortedSkills,
      commonIcons,
      itemFolders,
      parentFolder: this.parentFolder,
      hasSkills: this.skills.length > 0,
      // Helper for icon preview
      iconPreview: this.iconClass.startsWith("fa-solid") ? this.iconClass : `fa-solid ${this.iconClass}`
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    // Wire up input handlers that need real-time updates
    const form = this.element;

    // Step 1: Basics
    const classNameInput = form.querySelector("[name='className']");
    if (classNameInput) {
      classNameInput.addEventListener("input", (ev) => {
        this.className = ev.target.value.trim();
      });
    }

    const iconSelect = form.querySelector("[name='iconClass']");
    if (iconSelect) {
      iconSelect.addEventListener("change", (ev) => {
        this.iconClass = ev.target.value;
        this.render(false);
      });
    }

// Custom icon input - only update state, don't re-render on every keystroke
    const customIconInput = form.querySelector("[name='customIconClass']");
    if (customIconInput) {
      customIconInput.addEventListener("input", (ev) => {
        this.iconClass = ev.target.value.trim();
        // Update the icon preview live without full re-render
        const preview = form.querySelector(".icon-preview i");
        if (preview) {
          const iconClass = this.iconClass.startsWith("fa-solid") 
            ? this.iconClass 
            : `fa-solid ${this.iconClass}`;
          preview.className = iconClass;
        }
      });
    }

    // Step 2: Skills - handle field changes
    const skillFields = form.querySelectorAll("[data-skill-field]");
    skillFields.forEach(field => {
      field.addEventListener("input", (ev) => {
        const skillEl = ev.target.closest("[data-skill-id]");
        if (!skillEl) return;
        
        const skillId = parseInt(skillEl.dataset.skillId);
        const fieldName = ev.target.dataset.skillField;
        const skill = this.skills.find(s => s.id === skillId);
        
        if (!skill) return;
        
        if (fieldName === "weight") {
          skill[fieldName] = parseInt(ev.target.value) || 0;
        } else {
          skill[fieldName] = ev.target.value;
        }
      });
    });

    // Step 3: Preview - parent folder selection
    const parentFolderSelect = form.querySelector("[name='parentFolder']");
    if (parentFolderSelect) {
      parentFolderSelect.addEventListener("change", (ev) => {
        this.parentFolder = ev.target.value || null;
      });
    }
  }

  async _nextStep(event, target) {
    // Validate current step
    if (this.step === 1) {
      if (!this.className.trim()) {
        ui.notifications.warn(game.i18n.localize("DCCCS.Builder.Validation.ClassName"));
        return;
      }
    } else if (this.step === 2) {
      if (this.skills.length === 0) {
        ui.notifications.warn(game.i18n.localize("DCCCS.Builder.Validation.NoSkills"));
        return;
      }
      // Validate all skills have names
      const unnamed = this.skills.filter(s => !s.name.trim());
      if (unnamed.length > 0) {
        ui.notifications.warn(game.i18n.localize("DCCCS.Builder.Validation.UnnamedSkills"));
        return;
      }
    }

    this.step++;
    this.render(false);
  }

  async _prevStep(event, target) {
    this.step--;
    this.render(false);
  }

  async _addSkill(event, target) {
    this.skills.push({
      id: this.nextSkillId++,
      name: "",
      description: "",
      weight: 0
    });
    this.render(false);
  }

  async _removeSkill(event, target) {
    const skillId = parseInt(target.closest("[data-skill-id]").dataset.skillId);
    this.skills = this.skills.filter(s => s.id !== skillId);
    this.render(false);
  }

  async _moveSkillUp(event, target) {
    const skillId = parseInt(target.closest("[data-skill-id]").dataset.skillId);
    const index = this.skills.findIndex(s => s.id === skillId);
    if (index === -1 || index === 0) return;
    
    // Swap with previous
    [this.skills[index - 1], this.skills[index]] = [this.skills[index], this.skills[index - 1]];
    this.render(false);
  }

  async _moveSkillDown(event, target) {
    const skillId = parseInt(target.closest("[data-skill-id]").dataset.skillId);
    const index = this.skills.findIndex(s => s.id === skillId);
    if (index === -1 || index === this.skills.length - 1) return;
    
    // Swap with next
    [this.skills[index], this.skills[index + 1]] = [this.skills[index + 1], this.skills[index]];
    this.render(false);
  }

  async _createClass(event, target) {
    try {
      // 1. Create folder
      const folderData = {
        name: this.className,
        type: "Item",
        color: "#8b4513" // Brown color for custom classes
      };
      
      if (this.parentFolder) {
        folderData.folder = this.parentFolder;
      }
      
      const folder = await Folder.create(folderData);
      
      // 2. Create (CUSTOMCLASS) naming skill
      const iconLine = this.iconClass ? `<p>icon: ${this.iconClass}</p>` : "";
      const namingSkill = {
        name: `(CUSTOMCLASS)${this.className}`,
        type: "skill",
        folder: folder.id,
        img: "icons/svg/item-bag.svg",
        system: {
          description: {
            value: `${iconLine}<h3>${this.className}</h3><p>Custom class created with DCC Custom Class Builder.</p>`
          },
          config: {
            useSummary: true,
            useAbility: false,
            useDie: false,
            useLevel: false,
            useValue: false,
            showLastResult: false
          }
        }
      };
      
      // 3. Create prefixed skills
      const prefixedSkills = this.skills.map(s => {
        const weightSuffix = s.weight > 0 ? `^${s.weight}` : "";
        const description = s.description.trim() || `<p>${s.name}</p>`;
        
        return {
          name: `(${this.className}${weightSuffix})${s.name}`,
          type: "skill",
          folder: folder.id,
          img: "icons/svg/item-bag.svg",
          system: {
            description: {
              value: description
            },
            config: {
              useSummary: true,
              useAbility: true,
              useDie: true,
              useLevel: false,
              useValue: true,
              showLastResult: false
            },
            ability: "",
            die: "1d20",
            value: ""
          }
        };
      });
      
      // 4. Create all items in one transaction
      await Item.createDocuments([namingSkill, ...prefixedSkills]);
      
      // 5. Notify success
      ui.notifications.info(
        game.i18n.format("DCCCS.Builder.Success", {
          className: this.className,
          count: this.skills.length
        })
      );
      
      // 6. Close dialog
      this.close();
      
      // 7. If opened from an actor sheet, offer to apply immediately
      if (this.actor) {
        const apply = await Dialog.confirm({
          title: game.i18n.localize("DCCCS.Builder.ApplyTitle"),
          content: `<p>${game.i18n.format("DCCCS.Builder.ApplyContent", { className: this.className })}</p>`,
          yes: () => true,
          no: () => false,
          defaultYes: true
        });
        
        if (apply) {
          // Get all items from the folder
          const folderItems = game.items.filter(i => i.folder?.id === folder.id);
          const itemData = folderItems.map(i => i.toObject());
          
          // Create on actor
          await this.actor.createEmbeddedDocuments("Item", itemData);
          
          ui.notifications.info(
            game.i18n.format("DCCCS.Builder.Applied", { className: this.className })
          );
        }
      }
      
    } catch (error) {
      console.error(`[${MODULE_ID}] Error creating custom class:`, error);
      ui.notifications.error(
        game.i18n.localize("DCCCS.Builder.Error")
      );
    }
  }

  async _handleFormSubmit(event, form, formData) {
    // Form submission not used - all interactions are through action buttons
    event.preventDefault();
  }
}