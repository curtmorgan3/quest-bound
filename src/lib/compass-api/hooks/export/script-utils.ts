import type { Script } from '@/types';

/**
 * Sanitizes a filename for filesystem compatibility.
 * - Converts to lowercase
 * - Replaces spaces with underscores
 * - Removes special characters except underscores and hyphens
 * - Ensures the name is not empty
 */
export function sanitizeFileName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'unnamed';
  }

  return (
    name
      .toLowerCase()
      .trim()
      // Replace spaces with underscores
      .replace(/\s+/g, '_')
      // Remove special characters except underscores and hyphens
      .replace(/[^a-z0-9_-]/g, '')
      // Remove consecutive underscores
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '') || 'unnamed'
  );
}

/**
 * Parses a script file path to extract entity type and name.
 * Expected format: scripts/{entityType}s/{name}.qbs
 * Example: scripts/attributes/hit_points.qbs
 * Returns: { entityType: 'attribute', name: 'hit_points' }
 */
export function parseScriptPath(path: string): {
  entityType: 'attribute' | 'action' | 'item' | 'archetype' | 'global' | 'characterLoader';
  name: string;
} | null {
  // Remove leading/trailing slashes and normalize
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');

  // Match pattern: scripts/{type}/{name}.qbs
  const match = normalizedPath.match(/^scripts\/([^/]+)\/([^/]+)\.qbs$/);

  if (!match) {
    return null;
  }

  const [, typeFolder, filename] = match;

  // Map folder names to entity types
  let entityType: 'attribute' | 'action' | 'item' | 'archetype' | 'global' | 'characterLoader';
  switch (typeFolder) {
    case 'attributes':
      entityType = 'attribute';
      break;
    case 'actions':
      entityType = 'action';
      break;
    case 'items':
      entityType = 'item';
      break;
    case 'archetypes':
      entityType = 'archetype';
      break;
    case 'global':
      entityType = 'global';
      break;
    case 'character_loaders':
      entityType = 'characterLoader';
      break;
    default:
      return null;
  }

  return {
    entityType,
    name: filename,
  };
}

/**
 * Generates a file path for a script based on its entity type and name.
 * Example: generateScriptPath('attribute', 'Max Hit Points')
 * Returns: scripts/attributes/max_hit_points.qbs
 */
export function generateScriptPath(
  entityType: 'attribute' | 'action' | 'item' | 'archetype' | 'global' | 'characterLoader',
  name: string,
): string {
  const sanitizedName = sanitizeFileName(name);

  // Map entity types to folder names
  let folderName: string;
  switch (entityType) {
    case 'attribute':
      folderName = 'attributes';
      break;
    case 'action':
      folderName = 'actions';
      break;
    case 'item':
      folderName = 'items';
      break;
    case 'archetype':
      folderName = 'archetypes';
      break;
    case 'global':
      folderName = 'global';
      break;
    case 'characterLoader':
      folderName = 'character_loaders';
      break;
  }

  return `scripts/${folderName}/${sanitizedName}.qbs`;
}

/**
 * Validates script metadata for export.
 * Returns an array of validation errors (empty if valid).
 */
export function validateScriptForExport(script: Script): string[] {
  const errors: string[] = [];

  if (!script.name || typeof script.name !== 'string') {
    errors.push(`Script ${script.id}: name is required and must be a string`);
  }

  if (!script.sourceCode || typeof script.sourceCode !== 'string') {
    errors.push(`Script ${script.id}: sourceCode is required and must be a string`);
  }

  if (script.sourceCode && script.sourceCode.trim() === '') {
    errors.push(`Script ${script.id}: sourceCode cannot be empty`);
  }

  if (
    !['attribute', 'action', 'item', 'archetype', 'global', 'characterLoader'].includes(
      script.entityType,
    )
  ) {
    errors.push(
      `Script ${script.id}: entityType must be one of: attribute, action, item, archetype, global, characterLoader`,
    );
  }

  if (!script.isGlobal && script.entityType !== 'characterLoader' && !script.entityId) {
    errors.push(
      `Script ${script.id}: non-global, non-characterLoader scripts must have an entityId`,
    );
  }

  return errors;
}

/**
 * Validates script file path for import.
 * Returns an array of validation errors (empty if valid).
 */
export function validateScriptPath(path: string): string[] {
  const errors: string[] = [];

  if (!path || typeof path !== 'string') {
    errors.push('Script path is required and must be a string');
    return errors;
  }

  if (!path.endsWith('.qbs')) {
    errors.push(`Script path must have .qbs extension: ${path}`);
  }

  const parsed = parseScriptPath(path);
  if (!parsed) {
    errors.push(`Invalid script path format: ${path}. Expected: scripts/{type}/{name}.qbs`);
  }

  return errors;
}

/**
 * Checks for duplicate script names within a collection.
 * Returns a map of name -> count for names that appear more than once.
 */
export function findDuplicateScriptNames(scripts: Script[]): Map<string, number> {
  const nameCounts = new Map<string, number>();

  for (const script of scripts) {
    const count = nameCounts.get(script.name) || 0;
    nameCounts.set(script.name, count + 1);
  }

  // Filter to only duplicates
  const duplicates = new Map<string, number>();
  for (const [name, count] of nameCounts.entries()) {
    if (count > 1) {
      duplicates.set(name, count);
    }
  }

  return duplicates;
}

/**
 * Generates a unique script name by appending a number if needed.
 * Example: "hit_points" -> "hit_points_2" if "hit_points" already exists
 */
export function generateUniqueScriptName(baseName: string, existingNames: Set<string>): string {
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let counter = 2;
  let uniqueName = `${baseName}_${counter}`;

  while (existingNames.has(uniqueName)) {
    counter++;
    uniqueName = `${baseName}_${counter}`;
  }

  return uniqueName;
}
