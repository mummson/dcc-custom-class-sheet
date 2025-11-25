# DCC Custom Class Sheet
A Foundry VTT module for the Dungeon Crawl Classics system that adds a **Custom Class character sheet** with dynamic tab labels, grouped skills, and a visual class builder wizard.

![Foundry Version](https://img.shields.io/badge/Foundry-v13-informational)
![System](https://img.shields.io/badge/System-DCC-blue)
![License](https://img.shields.io/github/license/YOUR-USERNAME/dcc-custom-class-sheet)

## Features
### Custom Class Sheet
- **Selectable sheet** alongside default DCC sheets (Generic, Warrior, Wizard, etc.)
- **Dynamic tab label** - rename using a `(CUSTOMCLASS)YourClassName` skill
- **Custom tab icons** - set via FontAwesome classes in skill descriptions
- **Zero system intrusion** - uses Foundry's native sheet framework

### Intelligent Skill Grouping
- **Prefixed skills** automatically group: `(Barbarian^10)Rage`
- **Weight-based sorting** - higher weights appear first (e.g., `^10` before `^5`)
- **Class-matching priority** - skills matching the custom class name appear first
- **Occupational skills** - unprefixed skills automatically group at bottom

### Visual Class Builder
- **3-step wizard** for creating custom classes
- **Icon picker** with 15+ common icons + custom FontAwesome input
- **Skill editor** with drag-to-reorder, descriptions, and weights
- **Live preview** before creation
- **Folder organization** - creates structured Item folders
- **One-click apply** - optionally add class to actor immediately

### Interactive Skills
- **Tooltips** - hover over skill names to see full descriptions
- **Post to chat** - click skill names to share with players
- **Roll checks** - click skill icons to roll skill checks
- **Enriched HTML** - full support for tables, formatting, inline rolls

## Installation
1. Open Foundry VTT
2. Go to **Add-on Modules** tab
3. Click **Install Module**
4. Paste this URL: `https://github.com/YOUR-USERNAME/dcc-custom-class-sheet/releases/latest/download/module.json`
5. Click **Install**

## Quick Start
### Creating a Custom Class
1. **Create a new Player actor** or open an existing one
2. **Change sheet to "Custom Class"**:
   - Click the sheet config button (top-right)
   - Select "Custom Class" from dropdown
3. **Click "Create Custom Class" button** in the empty tab
4. **Follow the 3-step wizard**:
   - **Step 1**: Enter class name + choose icon
   - **Step 2**: Add skills with names/descriptions/weights
   - **Step 3**: Preview and create
5. **Apply to actor** when prompted (or drag folder from Items sidebar later)

### Example: Creating a Barbarian
**Step 1 - Basics:**
- Class Name: `Barbarian`
- Icon: `fa-axe-battle` (Axe)

**Step 2 - Skills:**
- `Rage` | Enter a primal fury that grants +4 Str | Weight: 10
- `Natural Armor` | Tough hide grants +2 AC | Weight: 10
- `Battle Cry` | Intimidate foes within 30 feet | Weight: 0

**Step 3 - Preview:**
- Select parent folder (optional)
- Click "Create Class"

**Result:**
- Folder created in Items: `Barbarian`
- Skills auto-prefixed: `(Barbarian^10)Rage`, etc.
- Tab label: "Barbarian" with axe icon
- Skills sorted by weight, then alphabetically

## Usage Guide
### Naming Conventions
#### Class Label Skill
Controls the tab name and icon:
```
Name: (CUSTOMCLASS)Barbarian
Description: 
<p>icon: fa-axe-battle</p>
<h3>Barbarian</h3>
<p>A fierce warrior from the frozen north...</p>
```

**Result**: Tab labeled "Barbarian" with axe icon

#### Prefixed Skills
Format: `(ClassName^Weight)SkillName`

Examples:
- `(Barbarian^10)Natural Armor` - Weight 10, appears first
- `(Barbarian)Rage` - Weight 0, alphabetical order
- `(Ranger^5)Track` - Different class group

#### Occupational Skills
No prefix needed:
- `Lockpicking`
- `Swimming`
- `Climbing`

These automatically group under "Occupational Skills" at the bottom.

### Custom Icons

Add to `(CUSTOMCLASS)` skill description:
```html
icon: fa-icon-name
```

**Popular Icons:**
- Barbarian: `fa-axe-battle`
- Monk: `fa-hand-fist`
- Ranger: `fa-bow-arrow`
- Wizard: `fa-hat-wizard`
- Rogue: `fa-mask`
- Cleric: `fa-cross`
- Druid: `fa-leaf`

**Find more:** [FontAwesome Icon Browser](https://fontawesome.com/search?o=r&m=free)

### Skill Weighting
Higher weights appear first within their group:

```
(Barbarian^20)Signature Move    ← Appears 1st
(Barbarian^10)Core Ability      ← Appears 2nd
(Barbarian^10)Another Core      ← Appears 3rd (alphabetical)
(Barbarian)Basic Skill          ← Appears last (weight 0)
```

### Multi-Class Characters
Use multiple class prefixes:
```
(CUSTOMCLASS)Ranger/Rogue
(Ranger^10)Track
(Ranger)Animal Companion
(Rogue^10)Sneak Attack
(Rogue)Pick Locks
Climbing                        ← Occupational
```

**Display order:**
1. Ranger group (alphabetically first after class name check)
2. Rogue group
3. Occupational Skills

## Tips & Tricks
### Organizing Classes in Folders
Use the Parent Folder selector in Step 3 to organize:
```
📁 Custom Classes
  📁 Barbarian
    📄 (CUSTOMCLASS)Barbarian
    📄 (Barbarian^10)Rage
  📁 Blood Mage
    📄 (CUSTOMCLASS)Blood Mage
    📄 (Blood Mage)Crimson Bolt
```
## Troubleshooting
### Tab Label Not Updating
- Ensure you have exactly **one** `(CUSTOMCLASS)Name` skill
- Spelling must be exact: `CUSTOMCLASS` (all caps)
- Reload the sheet after adding/changing

### Skills Not Appearing
- Check prefix format: `(ClassName)SkillName` or `(ClassName^Weight)SkillName`
- Verify item type is "skill" (not weapon, spell, etc.)
- Skills must belong to the actor (not just in Items directory)

### Icon Not Showing
- Format: `icon: fa-icon-name` at the top of `(CUSTOMCLASS)` description
- Use FontAwesome free icons only
- Falls back to ⚠️ if invalid

### Builder Button Not Working
- Check browser console for errors (F12)
- Verify module is enabled in game settings

## Compatibility
- **Foundry VTT**: v13+ (uses ApplicationV2 API)
- **DCC System**: 0.63+
- **Conflicts**: None known

## Roadmap
Potential future features:
- [ ] Bulk import from CSV/JSON
- [ ] Class templates compendium
- [ ] Automatic HD/Save/Attack progression
- [ ] Export class to .json
- [ ] Tweak the Custom Class creation wizard

## Contributing

Issues and pull requests welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Open a Pull Request

## License

This module is licensed under the [MIT License](LICENSE).

## Credits
**Author**: Dr. Mummson

**Acknowledgments**:
- Dungeon Crawl Classics system by Goodman Games
- Foundry VTT DCC system by [system authors]
- FontAwesome for icons

## Support
- **Issues**: [GitHub Issues](https://github.com/mummson/dcc-custom-class-sheet/issues)
- **Discord**: dr_mummson