# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Class templates compendium
- CSV/JSON bulk import for skills

## [1.0.0] - 2024-11-13

### Added
- Initial release of DCC Custom Class Sheet module
- Custom Class character sheet that extends DCC system's native sheets
- Dynamic tab label controlled by `(CUSTOMCLASS)Name` skill items
- Custom tab icons via FontAwesome classes in skill descriptions
- Intelligent skill grouping based on class prefixes
  - Format: `(ClassName^Weight)SkillName`
  - Higher weights sort to top within groups
  - Skills matching class name prioritized first
- Occupational skills group for unprefixed skills
- Visual 3-step Class Builder wizard
  - Step 1: Class name and icon selection
  - Step 2: Skill editor with add/remove/reorder
  - Step 3: Preview and parent folder selection
- 15+ common fantasy class icons in builder
- Custom FontAwesome icon input with browser link
- Skill tooltips showing enriched HTML descriptions
- Post-to-chat functionality for skills (click skill name)
- Roll skill checks (click skill icon)
- Items folder organization for created classes
- One-click apply to actor after class creation
- Full i18n support (English included)

### Technical
- Built on Foundry VTT v13 ApplicationV2 API
- Uses DCC system's native sheet framework (no core modifications)
- Extends `DCCActorSheetGeneric` for compatibility
- Zero conflicts with other modules
- Modular architecture:
  - `init.js` - Module constants and registration
  - `utils.js` - Parsing and helper functions
  - `custom-sheet.js` - Main sheet class
  - `class-builder.js` - Builder dialog (ApplicationV2)
  - `custom-class.html` - Main tab template
  - `class-builder.html` - Builder wizard template
  - `tabs-with-icons.html` - Enhanced tab navigation
  - `custom-class.css` - Scoped styling
  - `en.json` - Localization strings

### Dependencies
- Foundry VTT v13 or higher
- DCC system v0.63 or higher

### Known Issues
- None at release
- The character/actor sheet needs to be closed and reopened when skills are added that make changes to the "Custom Class" tab.

---

## Version History Guidelines

### Types of Changes
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerabilities

### Version Numbering
- **Major (X.0.0)**: Breaking changes, major rewrites
- **Minor (0.X.0)**: New features, backwards compatible
- **Patch (0.0.X)**: Bug fixes, minor tweaks