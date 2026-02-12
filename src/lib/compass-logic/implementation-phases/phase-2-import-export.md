# Phase 2: Import/Export

## Overview
Enable exporting scripts as `.qbs` files and importing them back. This allows external editing, version control, and sharing of scripts between rulesets.

## Goals
- Export scripts from database to `.qbs` files
- Import `.qbs` files back to database
- Maintain script-entity associations during export/import
- Support directory structure for organization
- Enable external editing workflow
- Integrate with existing ruleset export/import

## File Structure

### Export Directory Structure
```
ruleset-export/
├── scripts/
│   ├── global/
│   │   ├── utils.qbs
│   │   └── helpers.qbs
│   ├── attributes/
│   │   ├── hit_points.qbs
│   │   ├── armor_class.qbs
│   │   └── strength_modifier.qbs
│   ├── actions/
│   │   ├── melee_attack.qbs
│   │   ├── cast_spell.qbs
│   │   └── heal.qbs
│   └── items/
│       ├── health_potion.qbs
│       ├── plate_armor.qbs
│       └── magic_sword.qbs
└── ruleset.json
```

### File Naming Convention
- Sanitize entity names for filesystem compatibility
- Replace spaces with underscores
- Convert to lowercase
- Remove special characters except underscores and hyphens
- Example: "Max Hit Points" → "max_hit_points.qbs"

## File Format

### .qbs File Contents
Plain text QBScript source code:
```javascript
// hit_points.qbs
subscribe('Constitution', 'Level')

con = Owner.Attribute('Constitution').value
level = Owner.Attribute('Level').value

return 10 + (con * 2) + (level * 5)
```

### Metadata Storage
Script metadata stored in `ruleset.json`:
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
    },
    {
      "id": "script-789",
      "name": "utils",
      "file": "scripts/global/utils.qbs",
      "entityType": "global",
      "entityId": null,
      "entityName": null,
      "isGlobal": true,
      "enabled": true
    }
  ]
}
```

## Export Functions

### Export All Scripts
```typescript
async function exportScripts(rulesetId: string): Promise<ScriptExport[]> {
  // Get all scripts for ruleset
  // Convert to file structure
  // Return array of { path, content } objects
}
```

### Export Single Script
```typescript
async function exportScript(scriptId: string): Promise<{ path: string; content: string }> {
  // Get script from database
  // Determine file path based on entityType
  // Return path and source code
}
```

### Integration with Ruleset Export
Extend existing `use-export-ruleset.ts`:
```typescript
async function exportRuleset(rulesetId: string): Promise<Blob> {
  // ... existing export logic
  
  // Export scripts
  const scripts = await exportScripts(rulesetId);
  
  // Add scripts to zip
  for (const script of scripts) {
    zip.file(script.path, script.content);
  }
  
  // Update ruleset.json with script metadata
  // ... rest of export
}
```

## Import Functions

### Import All Scripts
```typescript
async function importScripts(
  rulesetId: string, 
  scriptFiles: { path: string; content: string }[],
  scriptMetadata: any[]
): Promise<void> {
  // Parse file paths to determine entityType
  // Match files with metadata
  // Create Script records in database
  // Link to entities using entityName lookup
}
```

### Import Single Script
```typescript
async function importScript(
  rulesetId: string,
  path: string,
  content: string,
  metadata?: any
): Promise<Script> {
  // Parse path to determine entityType
  // Find or create entity association
  // Create Script record
  // Return created script
}
```

### Integration with Ruleset Import
Extend existing `use-import-ruleset.ts`:
```typescript
async function importRuleset(zipFile: File): Promise<string> {
  // ... existing import logic
  
  // Extract script files from zip
  const scriptFiles = await extractScriptFiles(zip);
  
  // Get script metadata from ruleset.json
  const scriptMetadata = rulesetData.scripts || [];
  
  // Import scripts after entities are created
  await importScripts(newRulesetId, scriptFiles, scriptMetadata);
  
  // ... rest of import
}
```

## File Path Parsing

### Determine Entity Type from Path
```typescript
function parseScriptPath(path: string): {
  entityType: 'attribute' | 'action' | 'item' | 'global';
  name: string;
} {
  // Extract from path: scripts/attributes/hit_points.qbs
  // Returns: { entityType: 'attribute', name: 'hit_points' }
}
```

### Generate File Path
```typescript
function generateScriptPath(script: Script, entityName?: string): string {
  // Generate: scripts/attributes/hit_points.qbs
  const sanitized = sanitizeFileName(entityName || script.name);
  return `scripts/${script.entityType}s/${sanitized}.qbs`;
}
```

## Entity Association

### Linking Scripts to Entities on Import
```typescript
async function linkScriptToEntity(
  rulesetId: string,
  entityType: string,
  entityName: string
): Promise<string | null> {
  // Lookup entity by type and name
  // Return entityId for script association
  // Handle missing entities gracefully
}
```

### Handling Missing Entities
- If entity not found, create script but leave entityId null
- Log warning for manual association later
- Or skip importing that script with warning

## Validation

### Pre-Export Validation
- Ensure all scripts have valid entityId (except globals)
- Check for file name conflicts
- Validate source code is not empty

### Pre-Import Validation
- Validate .qbs file extension
- Check for duplicate script names
- Verify directory structure
- Validate metadata format

## Error Handling

### Export Errors
- Missing scripts (warn and skip)
- Invalid entity associations (warn and export anyway)
- File system errors (fail gracefully)

### Import Errors
- Invalid .qbs syntax (warn, import as-is for later fixing)
- Missing entity associations (import with null entityId)
- Duplicate names (append number or skip)
- Corrupted files (skip with error message)

## User Experience

### Export UI
- Button in ruleset settings: "Export Ruleset"
- Includes scripts automatically
- Option to export scripts separately

### Import UI
- File upload accepts .zip with scripts
- Shows import progress
- Displays warnings for unlinked scripts
- Allows manual entity association after import

## Testing

### Unit Tests
- [ ] File path parsing
- [ ] File name sanitization
- [ ] Export single script
- [ ] Export all scripts
- [ ] Import single script
- [ ] Import all scripts
- [ ] Entity association logic
- [ ] Metadata serialization

### Integration Tests
- [ ] Full export/import roundtrip
- [ ] Export with missing entities
- [ ] Import with modified .qbs files
- [ ] Import with missing entities
- [ ] Duplicate name handling

## Edge Cases

### Handling Conflicts
- Duplicate script names → append number
- Modified .qbs file during reimport → overwrite or create new?
- Deleted entity but script still exists → orphaned script handling

### Cross-Ruleset Scripts
- Global scripts are ruleset-specific
- Cannot import scripts without importing entities they reference
- Consider: shared script library in future?

## Dependencies
- Phase 1 (Data Model) - Need Script entity
- Existing export/import system (`use-export-ruleset.ts`, `use-import-ruleset.ts`)
- JSZip library (already in use)

## Deliverables
- [ ] Export functions for scripts
- [ ] Import functions for scripts
- [ ] Integration with ruleset export
- [ ] Integration with ruleset import
- [ ] File path utilities
- [ ] Entity association logic
- [ ] Unit tests
- [ ] Integration tests
- [ ] Update export/import UI

## Notes
- Scripts are exported as plain text (no validation at this phase)
- External editors can modify .qbs files freely
- No syntax checking until Phase 3 (Interpreter Core)
- Consider adding comments to exported files (metadata, warnings, etc.)
