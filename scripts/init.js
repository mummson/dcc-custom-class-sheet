// DCC Custom Class Sheet — initialization & shared constants
// This file exports only tiny, stable constants used by other module files.
// Keep it dependency-free to guarantee it loads first (as defined in module.json).

/** The module id as declared in module.json */
export const MODULE_ID = "dcc-custom-class-sheet";

/**
 * Naming token for the tab label skill. Case-insensitive.
 * A skill named "(CUSTOMCLASS)Salesman" will set the tab label to "Salesman".
 */
export const NAMING_TOKEN = "CUSTOMCLASS";

/**
 * Regex for the naming item that controls the tab label.
 * Examples:
 *  - "(CUSTOMCLASS)Salesman"  => label = "Salesman"
 *  - "(customclass)Bard"      => label = "Bard" (case-insensitive)
 *
 * Groups:
 *  1: label text (trimmed)
 */
export const REGEX_NAMING_ITEM = /^\(\s*customclass\s*\)\s*(.+)$/i;

/**
 * Regex for class-prefixed skills to be listed in the custom tab.
 * Examples:
 *  - "(Barbarian)Rage"            => class="Barbarian", weight=0, name="Rage"
 *  - "(Barbarian^10)Natural Armor" => class="Barbarian", weight=10, name="Natural Armor"
 *
 * Groups:
 *  1: class name (string, may contain spaces)
 *  2: weight (optional digits), defaults to 0 when absent
 *  3: remaining skill name (string)
 */
export const REGEX_PREFIXED_SKILL = /^\(\s*([^)]+?)\s*(?:\^(\d+))?\)\s*(.*)$/;

/** Simple console logger gated by dev mode; use via utils.vlog for richer logs. */
export function log(...args) {
  // Avoid noisy logs in production unless devMode is on
  if (game?.modules?.get(MODULE_ID)?.active) {
    console.log(`[${MODULE_ID}]`, ...args);
  }
}

/** Foundry entry point — light-touch init just to prove we’re alive */
Hooks.once("init", () => {
  log("Initializing module…");
});

/** Optional: confirm after systems load (useful when resolving system classes) */
Hooks.once("ready", () => {
  log("Ready. System:", game.system?.id, "v", game.system?.version);
});
