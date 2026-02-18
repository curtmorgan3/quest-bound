import { db } from '@/stores';
import type { Script } from '@/types';
import {
  parseScriptPath,
  validateScriptPath,
  generateUniqueScriptName,
} from './script-utils';
import type { ScriptMetadata } from './script-export';

/**
 * Represents a script file being imported.
 */
export interface ScriptImport {
  path: string; // File path within the zip (e.g., scripts/attributes/hit_points.qbs)
  content: string; // QBScript source code
}

/**
 * Result of importing scripts.
 */
export interface ScriptImportResult {
  importedCount: number;
  warnings: string[];
  errors: string[];
}

/**
 * Links a script to an entity by looking up the entity by type and name.
 * Returns the entity ID if found, null otherwise.
 */
export async function linkScriptToEntity(
  rulesetId: string,
  entityType: 'attribute' | 'action' | 'item' | 'global',
  entityName: string,
): Promise<string | null> {
  if (entityType === 'global') {
    return null; // Global scripts don't link to entities
  }

  try {
    // Query the appropriate table based on entity type
    switch (entityType) {
      case 'attribute': {
        const entity = await db.attributes
          .where('rulesetId')
          .equals(rulesetId)
          .and((attr) => attr.title === entityName)
          .first();
        return entity?.id || null;
      }
      case 'action': {
        const entity = await db.actions
          .where('rulesetId')
          .equals(rulesetId)
          .and((action) => action.title === entityName)
          .first();
        return entity?.id || null;
      }
      case 'item': {
        const entity = await db.items
          .where('rulesetId')
          .equals(rulesetId)
          .and((item) => item.title === entityName)
          .first();
        return entity?.id || null;
      }
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error linking script to entity ${entityType}:${entityName}:`, error);
    return null;
  }
}

/**
 * Imports a single script from a file.
 */
export async function importScript(
  rulesetId: string,
  scriptImport: ScriptImport,
  metadata?: ScriptMetadata,
  existingScriptNames?: Set<string>,
): Promise<{ success: boolean; warnings: string[]; errors: string[] }> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validate file path
  const pathErrors = validateScriptPath(scriptImport.path);
  if (pathErrors.length > 0) {
    errors.push(...pathErrors);
    return { success: false, warnings, errors };
  }

  // Parse file path to get entity type and name
  const parsed = parseScriptPath(scriptImport.path);
  if (!parsed) {
    errors.push(`Failed to parse script path: ${scriptImport.path}`);
    return { success: false, warnings, errors };
  }

  const { entityType, name: fileBasedName } = parsed;

  // Use metadata if available, otherwise derive from file
  let scriptName = fileBasedName;
  let entityId: string | null = null;
  let entityName: string | null = null;
  let isGlobal = entityType === 'global';
  let enabled = true;
  let category: string | undefined;
  let scriptId: string | undefined;

  if (metadata) {
    scriptName = metadata.name;
    entityId = metadata.entityId;
    entityName = metadata.entityName;
    isGlobal = metadata.isGlobal;
    enabled = metadata.enabled;
    category = metadata.category;
    scriptId = metadata.id;
  }

  // Validate source code
  if (!scriptImport.content || scriptImport.content.trim() === '') {
    warnings.push(`Script ${scriptName} has empty source code. Importing anyway for later editing.`);
  }

  // Try to link to entity if we have an entity name but no entity ID
  if (!isGlobal && entityName && !entityId) {
    entityId = await linkScriptToEntity(rulesetId, entityType, entityName);
    if (!entityId) {
      warnings.push(
        `Script ${scriptName}: Could not find entity "${entityName}" (${entityType}). Script imported with null entityId.`,
      );
    }
  }

  // Handle duplicate names
  if (existingScriptNames) {
    if (existingScriptNames.has(scriptName)) {
      const uniqueName = generateUniqueScriptName(scriptName, existingScriptNames);
      warnings.push(`Script name "${scriptName}" already exists. Renamed to "${uniqueName}".`);
      scriptName = uniqueName;
    }
    existingScriptNames.add(scriptName);
  }

  // Create script record
  const now = new Date().toISOString();
  const script: Script = {
    id: scriptId || crypto.randomUUID(),
    rulesetId,
    name: scriptName,
    sourceCode: scriptImport.content,
    entityType,
    entityId,
    isGlobal,
    enabled,
    ...(category !== undefined && { category }),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.scripts.add(script);
    return { success: true, warnings, errors };
  } catch (error) {
    errors.push(
      `Failed to import script ${scriptName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return { success: false, warnings, errors };
  }
}

/**
 * Imports multiple scripts from files with their metadata.
 */
export async function importScripts(
  rulesetId: string,
  scriptFiles: ScriptImport[],
  scriptMetadata: ScriptMetadata[],
): Promise<ScriptImportResult> {
  const result: ScriptImportResult = {
    importedCount: 0,
    warnings: [],
    errors: [],
  };

  if (scriptFiles.length === 0) {
    return result;
  }

  // Build a map of file paths to metadata
  const metadataMap = new Map<string, ScriptMetadata>();
  for (const meta of scriptMetadata) {
    metadataMap.set(meta.file, meta);
  }

  // Track existing script names to avoid duplicates
  const existingScriptNames = new Set<string>();

  // Get existing scripts in the ruleset
  const existingScripts = await db.scripts.where('rulesetId').equals(rulesetId).toArray();
  for (const script of existingScripts) {
    existingScriptNames.add(script.name);
  }

  // Import each script
  for (const scriptFile of scriptFiles) {
    const metadata = metadataMap.get(scriptFile.path);

    const importResult = await importScript(
      rulesetId,
      scriptFile,
      metadata,
      existingScriptNames,
    );

    if (importResult.success) {
      result.importedCount++;
    }

    result.warnings.push(...importResult.warnings);
    result.errors.push(...importResult.errors);
  }

  return result;
}

/**
 * Extracts script files from a JSZip instance.
 * Returns an array of ScriptImport objects.
 * @param pathPrefix - Optional root path (e.g. "MyFolder/") when zip was created by compressing a folder
 */
export async function extractScriptFiles(
  zipContent: any,
  pathPrefix = '',
): Promise<ScriptImport[]> {
  const scriptFiles: ScriptImport[] = [];

  // Find all .qbs files in the scripts/ folder
  const scriptsPrefix = pathPrefix + 'scripts/';
  const scriptFileEntries = Object.entries(zipContent.files).filter(
    ([path]) => path.startsWith(scriptsPrefix) && path.endsWith('.qbs'),
  );

  for (const [path, file] of scriptFileEntries as [string, any][]) {
    try {
      const content = await file.async('text');
      // Store logical path (scripts/...) for metadata matching and parseScriptPath
      const logicalPath = pathPrefix ? path.slice(pathPrefix.length) : path;
      scriptFiles.push({ path: logicalPath, content });
    } catch (error) {
      console.error(`Failed to read script file ${path}:`, error);
    }
  }

  return scriptFiles;
}
