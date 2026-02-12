import { db } from '@/stores';
import {
  findDuplicateScriptNames,
  generateScriptPath,
  sanitizeFileName,
  validateScriptForExport,
} from './script-utils';

/**
 * Represents a script file to be exported.
 */
export interface ScriptExport {
  path: string; // File path within the zip (e.g., scripts/attributes/hit_points.qbs)
  content: string; // QBScript source code
}

/**
 * Represents script metadata to be stored in ruleset.json.
 */
export interface ScriptMetadata {
  id: string;
  name: string;
  file: string; // Relative path to the .qbs file
  entityType: 'attribute' | 'action' | 'item' | 'global';
  entityId: string | null;
  entityName: string | null; // Name of the associated entity (for re-linking on import)
  isGlobal: boolean;
  enabled: boolean;
}

/**
 * Result of exporting scripts, including files and metadata.
 */
export interface ScriptExportResult {
  files: ScriptExport[]; // Array of script files to add to zip
  metadata: ScriptMetadata[]; // Metadata to add to ruleset.json
  warnings: string[]; // Non-fatal warnings
  errors: string[]; // Fatal errors
}

/**
 * Exports a single script to a file path and content.
 */
export async function exportScript(scriptId: string): Promise<ScriptExport | null> {
  const script = await db.scripts.get(scriptId);

  if (!script) {
    return null;
  }

  // Validate script
  const validationErrors = validateScriptForExport(script);
  if (validationErrors.length > 0) {
    console.warn(`Script ${scriptId} validation failed:`, validationErrors);
    return null;
  }

  // Generate file path
  const path = generateScriptPath(script.entityType, script.name);

  return {
    path,
    content: script.sourceCode,
  };
}

/**
 * Exports all scripts for a ruleset.
 * Returns script files and metadata for inclusion in the export.
 */
export async function exportScripts(rulesetId: string): Promise<ScriptExportResult> {
  const result: ScriptExportResult = {
    files: [],
    metadata: [],
    warnings: [],
    errors: [],
  };

  // Get all scripts for the ruleset
  const scripts = await db.scripts.where('rulesetId').equals(rulesetId).toArray();

  if (scripts.length === 0) {
    return result;
  }

  // Check for duplicate names
  const duplicates = findDuplicateScriptNames(scripts);
  if (duplicates.size > 0) {
    for (const [name, count] of duplicates.entries()) {
      result.warnings.push(
        `Duplicate script name "${name}" appears ${count} times. Files may be overwritten.`,
      );
    }
  }

  // Get entity names for metadata
  const entityNameMap = await buildEntityNameMap(rulesetId);

  // Process each script
  for (const script of scripts) {
    // Validate script
    const validationErrors = validateScriptForExport(script);
    if (validationErrors.length > 0) {
      result.warnings.push(
        `Skipping script ${script.id} (${script.name}): ${validationErrors.join(', ')}`,
      );
      continue;
    }

    // Generate file path
    const path = generateScriptPath(script.entityType, script.name);

    // Add to files
    result.files.push({
      path,
      content: script.sourceCode,
    });

    // Get entity name for metadata
    const entityName = script.entityId ? entityNameMap.get(script.entityId) || null : null;

    // Add to metadata
    result.metadata.push({
      id: script.id,
      name: script.name,
      file: path,
      entityType: script.entityType,
      entityId: script.entityId,
      entityName,
      isGlobal: script.isGlobal,
      enabled: script.enabled,
    });
  }

  return result;
}

/**
 * Builds a map of entity IDs to entity names for all entities in a ruleset.
 * This is used to store entity names in script metadata for re-linking on import.
 */
async function buildEntityNameMap(rulesetId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  // Get all attributes
  const attributes = await db.attributes.where('rulesetId').equals(rulesetId).toArray();
  for (const attr of attributes) {
    map.set(attr.id, attr.title);
  }

  // Get all actions
  const actions = await db.actions.where('rulesetId').equals(rulesetId).toArray();
  for (const action of actions) {
    map.set(action.id, action.title);
  }

  // Get all items
  const items = await db.items.where('rulesetId').equals(rulesetId).toArray();
  for (const item of items) {
    map.set(item.id, item.title);
  }

  return map;
}

/**
 * Checks if a script name would cause a file path conflict.
 * Returns true if the sanitized name is different from the original.
 */
export function hasFileNameConflict(scriptName: string): boolean {
  const sanitized = sanitizeFileName(scriptName);
  return sanitized !== scriptName.toLowerCase().replace(/\s+/g, '_');
}
