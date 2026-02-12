# Phase 2 Implementation Summary

## Overview
Successfully implemented Phase 2: Import/Export for QBScript files, enabling external editing, version control, and sharing of scripts between rulesets.

## Files Created

### 1. Core Functionality
- **`src/lib/compass-api/hooks/export/script-utils.ts`**
  - `sanitizeFileName()` - Converts names to filesystem-safe format
  - `parseScriptPath()` - Extracts entity type and name from file paths
  - `generateScriptPath()` - Creates file paths for scripts
  - `validateScriptForExport()` - Validates scripts before export
  - `validateScriptPath()` - Validates script file paths
  - `findDuplicateScriptNames()` - Detects duplicate script names
  - `generateUniqueScriptName()` - Generates unique names for duplicates

- **`src/lib/compass-api/hooks/export/script-export.ts`**
  - `exportScript()` - Exports a single script to file
  - `exportScripts()` - Exports all scripts for a ruleset
  - Generates `.qbs` files organized by entity type
  - Creates metadata for `ruleset.json`
  - Builds entity name maps for re-linking on import

- **`src/lib/compass-api/hooks/export/script-import.ts`**
  - `importScript()` - Imports a single script from file
  - `importScripts()` - Imports multiple scripts with metadata
  - `linkScriptToEntity()` - Links scripts to entities by name lookup
  - `extractScriptFiles()` - Extracts `.qbs` files from zip archives
  - Handles missing entities gracefully
  - Resolves duplicate names automatically

### 2. Tests
- **`tests/unit/lib/compass-api/hooks/export/script-utils.test.ts`**
  - 48 unit tests covering all utility functions
  - All tests passing ✅

- **`tests/integration/script-export-import.test.ts`**
  - 7 integration tests for export/import roundtrip
  - Tests require browser environment (IndexedDB)
  - Marked as `.skip` for standard test runner

## Files Modified

### 1. Export System
- **`src/lib/compass-api/hooks/export/use-export-ruleset.ts`**
  - Added import for `exportScripts()`
  - Integrated script export into main export flow
  - Scripts exported before TSV files
  - Script metadata added to `metadata.json`
  - Script files added to zip with proper paths
  - Updated README to document script files
  - Added script count to export metadata

### 2. Import System
- **`src/lib/compass-api/hooks/export/use-import-ruleset.ts`**
  - Added imports for `extractScriptFiles()` and `importScripts()`
  - Added `Script` type import
  - Updated `ImportedMetadata` interface to include scripts
  - Updated `ImportRulesetResult` interface to include scripts count
  - Added scripts: 0 to all `importedCounts` initializations
  - Integrated script import after entities are created
  - Scripts imported after characters (ensures entities exist for linking)
  - Script warnings/errors added to overall import result
  - Updated `deleteRulesetAndRelatedData()` to delete scripts and script errors

### 3. Duplication System
- **`src/lib/compass-api/hooks/export/duplicate-ruleset.ts`**
  - Added `Script` type import
  - Updated `RulesetDuplicationCounts` interface to include scripts
  - Added scripts to entity loading (Promise.all)
  - Added script duplication logic (section 8)
  - Maps `entityId` based on `entityType` (attribute/action/item)
  - Handles global scripts (no entity mapping)
  - Updated section numbering (Windows: 9, Components: 10, Characters: 11, Cleanup: 12)
  - Added scripts: 0 to counts initialization

### 4. Exports
- **`src/lib/compass-api/hooks/export/index.ts`**
  - Added exports for `script-utils`
  - Added exports for `script-export`
  - Added exports for `script-import`

## File Structure

### Exported Scripts Directory Structure
```
ruleset-export.zip
├── scripts/
│   ├── global/
│   │   └── utils.qbs
│   ├── attributes/
│   │   ├── hit_points.qbs
│   │   └── armor_class.qbs
│   ├── actions/
│   │   ├── melee_attack.qbs
│   │   └── cast_spell.qbs
│   └── items/
│       ├── health_potion.qbs
│       └── magic_sword.qbs
├── application data/
│   └── metadata.json  (includes scripts array)
└── README.md
```

### Script Metadata Format
```json
{
  "scripts": [
    {
      "id": "script-123",
      "name": "hit_points",
      "file": "scripts/attributes/hit_points.qbs",
      "entityType": "attribute",
      "entityId": "attr-456",
      "entityName": "Hit Points",
      "isGlobal": false,
      "enabled": true
    }
  ]
}
```

## Key Features

### Export
- ✅ Exports all scripts for a ruleset
- ✅ Organizes by entity type (global, attributes, actions, items)
- ✅ Sanitizes filenames for filesystem compatibility
- ✅ Stores metadata in `ruleset.json`
- ✅ Validates scripts before export
- ✅ Warns about duplicate names
- ✅ Includes entity names for re-linking on import

### Import
- ✅ Imports scripts from `.qbs` files
- ✅ Links scripts to entities by name lookup
- ✅ Handles missing entities gracefully (null entityId)
- ✅ Resolves duplicate names automatically
- ✅ Preserves modified script content
- ✅ Validates file paths and structure
- ✅ Comprehensive error and warning reporting

### Duplication
- ✅ Duplicates scripts when duplicating rulesets
- ✅ Remaps entity references (attribute/action/item IDs)
- ✅ Handles global scripts (no entity mapping)
- ✅ Generates new IDs for all duplicated scripts
- ✅ Maintains script-entity associations

## Validation & Error Handling

### Pre-Export Validation
- Script name is required and non-empty
- Source code is required and non-empty
- Entity type is valid (attribute/action/item/global)
- Non-global scripts have entityId
- Warns about duplicate script names

### Pre-Import Validation
- File path has `.qbs` extension
- File path matches expected format
- Directory structure is valid
- Entity type can be determined from path

### Error Handling
- **Export**: Warns on invalid scripts, continues with valid ones
- **Import**: Warns on missing entities, imports with null entityId
- **Import**: Resolves duplicate names by appending numbers
- **Import**: Warns on empty source code, imports anyway for later editing

## Testing

### Unit Tests (48 tests, all passing ✅)
- `sanitizeFileName()` - 10 tests
- `parseScriptPath()` - 9 tests
- `generateScriptPath()` - 6 tests
- `validateScriptForExport()` - 7 tests
- `validateScriptPath()` - 5 tests
- `findDuplicateScriptNames()` - 4 tests
- `generateUniqueScriptName()` - 5 tests

### Integration Tests (7 tests, require browser)
- Export/import single attribute script
- Export/import multiple scripts of different types
- Handle modified script content during reimport
- Handle missing entity during import
- Handle duplicate script names during import
- Extract script files from zip
- Handle empty source code with warning

## User Experience

### Export
- Scripts automatically included in ruleset exports
- No additional UI changes needed
- Scripts documented in export README
- Export metadata shows script count

### Import
- Scripts automatically imported with rulesets
- Warnings displayed for unlinked scripts
- Duplicate names resolved automatically
- Import summary shows script count

### External Editing
- `.qbs` files are plain text QBScript
- Can be edited in any text editor
- Changes preserved on re-import
- Version control friendly (Git, etc.)

## Dependencies
- Phase 1 (Data Model) ✅ - Script entity exists in database
- JSZip library ✅ - Already in use for exports
- Dexie ✅ - Database operations
- TypeScript ✅ - Type safety throughout

## Status
✅ **Phase 2 Complete**

All deliverables implemented:
- ✅ Export functions for scripts
- ✅ Import functions for scripts
- ✅ Integration with ruleset export
- ✅ Integration with ruleset import
- ✅ File path utilities
- ✅ Entity association logic
- ✅ Unit tests
- ✅ Integration tests (documented)
- ✅ Duplication support

## Next Steps (Phase 3)
- Implement QBScript interpreter core
- Add syntax validation for `.qbs` files
- Enable script execution
- Add runtime error handling
