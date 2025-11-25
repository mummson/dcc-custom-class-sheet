// DCC Custom Class Sheet — shared helpers
// Centralizes small logic helpers used by the custom sheet.
// Keep pure functions only — no Foundry stateful code except ChatMessage.create.

import { MODULE_ID, REGEX_PREFIXED_SKILL, REGEX_NAMING_ITEM, NAMING_TOKEN } from "./init.js";

/**
 * Parse the name of a Skill item for a class prefix and optional weight.
 * @param {string} name - The Item's name.
 * @returns {{ className: string, weight: number, skillName: string }|null}
 */
export function parsePrefixedSkillName(name) {
  const match = name.match(REGEX_PREFIXED_SKILL);
  if (!match) return null;
  const [, cls, weight, skillName] = match;
  return {
    className: cls.trim(),
    weight: weight ? parseInt(weight, 10) : 0,
    skillName: skillName.trim(),
  };
}

/**
 * Check whether a skill name designates a CUSTOMCLASS label.
 * @param {string} name
 * @returns {string|null} label if match, else null.
 */
export function parseNamingItem(name) {
  const m = name.match(REGEX_NAMING_ITEM);
  if (!m) return null;
  return m[1].trim();
}

/**
 * Build grouped and sorted data structure for the actor’s prefixed skills.
 * @param {Actor} actor - Actor whose items we analyze.
 * @returns {{ [className: string]: Array<Item> }}
 */
export function groupActorSkills(actor) {
  const grouped = {};
  const occupational = [];

  for (const item of actor.items) {
    // Only Skill items
    if ((item.type ?? "").toLowerCase() !== "skill") continue;

    // Skip naming items: (CUSTOMCLASS)Foo - completely hidden
    if (parseNamingItem(item.name)) continue;

    const parsed = parsePrefixedSkillName(item.name);
    
    // No prefix = occupational skill
    if (!parsed) {
      occupational.push(item);
      continue;
    }

    // Guard against someone using "(CUSTOMCLASS)X" as a prefixed name
    if (parsed.className.trim().toLowerCase() === NAMING_TOKEN.toLowerCase()) continue;

    const { className } = parsed;
    if (!grouped[className]) grouped[className] = [];
    grouped[className].push({ item, parsed });
  }

  // Sort each prefixed group: high weight first, then alphabetical
  for (const className of Object.keys(grouped)) {
    grouped[className].sort((a, b) => {
      if (b.parsed.weight !== a.parsed.weight) return b.parsed.weight - a.parsed.weight;
      return a.parsed.skillName.localeCompare(b.parsed.skillName, undefined, { sensitivity: "base" });
    });
  }

  // Sort occupational skills alphabetically by name
  occupational.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return { grouped, occupational };
}


/**
 * Find a (CUSTOMCLASS) naming item and return its label.
 * @param {Actor} actor
 * @returns {string|null} the custom tab label or null if not found
 */
export function getCustomClassLabel(actor) {
  // Search actor's skills for naming items
  const namingSkills = actor.items.filter(
    (i) => (i.type ?? "").toLowerCase() === "skill" && parseNamingItem(i.name)
  );
  if (!namingSkills.length) return null;
  // simplest logic: pick the last one in update order (least code)
  namingSkills.sort((a, b) => (a.updateTime || 0) - (b.updateTime || 0));
  const last = namingSkills.at(-1);
  const label = parseNamingItem(last.name);
  return label;
}

/**
 * Parse a FontAwesome icon class from a (CUSTOMCLASS) skill's description HTML.
 * Looks for a <p>icon: fa-something</p> tag at the start of the description.
 * @param {string} descriptionHTML - The skill's system.description.value HTML
 * @returns {string|null} The FontAwesome class or null if not found
 */
export function parseCustomClassIcon(descriptionHTML) {
  if (!descriptionHTML) return null;
  
  // Match <p>icon: fa-whatever</p> (case-insensitive, handles whitespace)
  const match = descriptionHTML.match(/<p>\s*icon:\s*([a-z0-9\-]+)\s*<\/p>/i);
  if (!match) return null;
  
  const iconClass = match[1].trim();
  
  // Basic validation: must start with 'fa-'
  if (!/^fa-[a-z0-9\-]+$/i.test(iconClass)) return null;
  
  return iconClass;
}

/**
 * Get the custom icon class for the actor's custom class tab.
 * Reads from the (CUSTOMCLASS) naming skill's description.
 * @param {Actor} actor
 * @returns {string} FontAwesome class (with fa-solid prefix if needed) or default placeholder
 */
export function getCustomClassIcon(actor) {
  const DEFAULT_ICON = "fa-solid fa-circle-exclamation";
  
  // Find the (CUSTOMCLASS) naming skill
  const namingSkills = actor.items.filter(
    (i) => (i.type ?? "").toLowerCase() === "skill" && parseNamingItem(i.name)
  );
  
  if (!namingSkills.length) return DEFAULT_ICON;
  
  // Use the most recently updated one (same logic as getCustomClassLabel)
  namingSkills.sort((a, b) => (a.updateTime || 0) - (b.updateTime || 0));
  const namingSkill = namingSkills.at(-1);
  
  const descriptionHTML = namingSkill.system?.description?.value || "";
  const iconClass = parseCustomClassIcon(descriptionHTML);
  
  if (!iconClass) return DEFAULT_ICON;
  
  // Auto-prepend fa-solid if user only provided fa-something
  if (iconClass.startsWith("fa-") && !iconClass.startsWith("fa-solid") && !iconClass.startsWith("fa-regular") && !iconClass.startsWith("fa-brands")) {
    return `fa-solid ${iconClass}`;
  }
  
  return iconClass;
}

/**
 * Create a simple chat message for a skill's description.
 * Uses unprefixed name and includes skill image.
 * @param {Item} item - The skill item
 * @param {string} displayName - The unprefixed skill name to display
 */
export async function postSkillToChat(item, displayName) {
  const name = displayName || item.name;
  const html = item.system?.description?.value || "";
  const img = item.img || "icons/svg/item-bag.svg";
  
  // Build chat content using Foundry's chat message structure
  const content = `
    <div class="dcc-skill-chat-message">
      <div class="flexrow" style="align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; border-bottom: 2px solid var(--color-border-dark); padding-bottom: 0.25rem;">
        <img src="${img}" alt="${name}" width="36" height="36" style="border: none; flex-shrink: 0;" />
        <h3 style="margin: 0; flex: 1; font-size: 1.1em;">${name}</h3>
      </div>
      <div class="skill-description">${html}</div>
    </div>
  `;
  
  await ChatMessage.create({ 
    speaker: ChatMessage.getSpeaker({ actor: item.actor }), 
    content,
    flags: { core: { canPopout: true } }
  });
}

/**
 * Purge all (CUSTOMCLASS) naming items from an actor.
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export async function purgeNamingItems(actor) {
  const toDelete = actor.items
    .filter((i) => (i.type ?? "").toLowerCase() === "skill" && parseNamingItem(i.name))
    .map((i) => i.id);
  if (!toDelete.length) return;
  await actor.deleteEmbeddedDocuments("Item", toDelete);
  ui.notifications?.info(`${MODULE_ID}: Purged ${toDelete.length} (CUSTOMCLASS) skills.`);
}
