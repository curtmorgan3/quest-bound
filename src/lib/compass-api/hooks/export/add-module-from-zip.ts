import { db } from '@/stores';
import JSZip from 'jszip';
import type { AddModuleResult } from './add-module-to-ruleset';
import { addModuleToRuleset } from './add-module-to-ruleset';
import { deleteRulesetAndRelatedData } from './delete-ruleset-and-related-data';
import type { ImportRulesetResult } from './use-import-ruleset';

const METADATA_PATH = 'application data/metadata.json';

interface ZipMetadata {
  ruleset: {
    id: string;
    title: string;
    description?: string;
    version?: string;
    image?: string | null;
    isModule?: boolean;
  };
}

/**
 * Parse a ruleset zip file and return its metadata (ruleset id, title, etc.).
 * Throws if the zip is invalid or metadata is missing.
 */
export async function parseRulesetZipMetadata(file: File): Promise<ZipMetadata> {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);
  let metadataFile = zipContent.file(METADATA_PATH);
  if (!metadataFile) {
    const key = Object.keys(zipContent.files).find((p) => p.endsWith(METADATA_PATH));
    if (key) metadataFile = zipContent.file(key) ?? null;
  }
  if (!metadataFile) {
    throw new Error(
      'Invalid zip: application data/metadata.json not found. Use the same format as a ruleset export.',
    );
  }
  const metadataText = await metadataFile.async('text');
  const metadata = JSON.parse(metadataText) as ZipMetadata;
  if (!metadata?.ruleset?.id || typeof metadata.ruleset.id !== 'string') {
    throw new Error('Invalid zip: metadata.ruleset.id is required.');
  }
  return metadata;
}

export interface AddModuleFromZipParams {
  file: File;
  targetRulesetId: string;
  /** The import function from useImportRuleset() - used to import zip content into a temp ruleset */
  importRuleset: (
    file: File,
    options?: { contentOnlyIntoRulesetId: string },
  ) => Promise<ImportRulesetResult>;
}

/**
 * Add a module to a ruleset from an uploaded zip file (same format as ruleset export).
 * Requires metadata.ruleset.id in the zip. Imports zip content into a temporary ruleset,
 * runs addModuleToRuleset, then deletes the temp ruleset.
 */
export async function addModuleFromZip({
  file,
  targetRulesetId,
  importRuleset,
}: AddModuleFromZipParams): Promise<AddModuleResult> {
  const metadata = await parseRulesetZipMetadata(file);
  const moduleId = metadata.ruleset.id;

  const targetRuleset = await db.rulesets.get(targetRulesetId);
  if (!targetRuleset) throw new Error('Target ruleset not found');

  const existingModules = (targetRuleset as { modules?: { id: string }[] }).modules ?? [];
  if (existingModules.some((m) => m.id === moduleId)) {
    throw new Error('This module is already added to the ruleset.');
  }

  // Ensure temp ruleset exists so import can fill it
  const existingTemp = await db.rulesets.get(moduleId);
  if (!existingTemp) {
    const now = new Date().toISOString();
    await db.rulesets.add({
      id: moduleId,
      title: metadata.ruleset.title ?? 'Temp',
      description: metadata.ruleset.description ?? '',
      version: metadata.ruleset.version ?? '1.0.0',
      createdBy: '',
      details: {},
      image: metadata.ruleset.image ?? null,
      assetId: null,
      isModule: metadata.ruleset.isModule,
      createdAt: now,
      updatedAt: now,
      palette: [],
    });
  }

  const importResult = await importRuleset(file, { contentOnlyIntoRulesetId: moduleId });

  if (!importResult.success) {
    await deleteRulesetAndRelatedData(moduleId);
    throw new Error(importResult.message || 'Import failed');
  }

  try {
    const result = await addModuleToRuleset({
      sourceRulesetId: moduleId,
      targetRulesetId,
    });
    return result;
  } finally {
    await deleteRulesetAndRelatedData(moduleId);
  }
}
