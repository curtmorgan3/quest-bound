import { useErrorHandler } from '@/hooks';
import { db } from '../../db';
import type {
  Action,
  Archetype,
  ArchetypeCustomProperty,
  Asset,
  Attribute,
  Campaign,
  CampaignCharacter,
  CampaignEvent,
  CampaignScene,
  Character,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Chart,
  Component,
  Composite,
  CompositeVariant,
  CustomProperty,
  Document,
  Font,
  Inventory,
  InventoryItem,
  Item,
  ItemCustomProperty,
  Page,
  Ruleset,
  RulesetWindow,
  SceneTurnCallback,
  Window,
} from '@/types';
import JSZip from 'jszip';
import { useState } from 'react';
import { useRulesets } from '../rulesets';
import { deleteRulesetAndRelatedData } from './delete-ruleset-and-related-data';
import { duplicateRuleset } from './duplicate-ruleset';
import type { ScriptMetadata } from './script-export';
import { extractScriptFiles, importScripts } from './script-import';
import { ACTION_FIELD_TYPES, ATTRIBUTE_FIELD_TYPES, ITEM_FIELD_TYPES } from './types';
import { compareVersion, convertAttributeDefaultValue, parseTsv, tsvToObjects } from './utils';

const URL_PATTERN = /^https?:\/\//i;

function isUrl(s: string): boolean {
  return URL_PATTERN.test(s);
}

function filenameFromUrlForImport(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean).pop();
    if (seg) return seg;
  } catch {
    // ignore
  }
  return crypto.randomUUID();
}

/**
 * Coerce imported `sheetFitToViewport` to boolean or omit it.
 * Zip JSON may use JSON null, legacy 0/1, or string booleans from other exporters.
 */
function normalizeImportedSheetFitToViewport(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
    return undefined;
  }
  return undefined;
}

/** Chunk size for bulk IndexedDB writes. Smaller = more yields, less lock risk; larger = fewer round-trips. */
const BULK_CHUNK_SIZE = 1000;
/** Smaller chunk for large records (assets, fonts, documents with embedded data). */
const BULK_CHUNK_SIZE_LARGE = 100;

/**
 * Write many records in chunks to avoid long-running IndexedDB transactions and main-thread blocking.
 * Yields to the event loop between chunks so the browser stays responsive and the DB connection doesn't lock.
 * Table type is permissive so Dexie EntityTable (bulkAdd with optional args and PromiseExtended return) is accepted.
 */
async function bulkAddInChunks<T>(
  table: { bulkAdd(items: readonly T[] | T[], ...args: unknown[]): Promise<unknown> },
  items: T[],
  chunkSize: number = BULK_CHUNK_SIZE,
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await table.bulkAdd(chunk);
    if (i + chunkSize < items.length) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
}

/** Create a URL asset for import when entity has image (URL) and no assetId. Returns new asset id. */
async function createUrlAssetForImport(url: string, rulesetId: string | null): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.assets.add({
    id,
    data: url,
    type: 'url',
    filename: filenameFromUrlForImport(url),
    createdAt: now,
    updatedAt: now,
    rulesetId,
  });
  return id;
}

/** Resolve asset id for a URL: use existing id from urlToAssetIdMap (e.g. from assets.json) or create a new asset. */
async function getOrCreateUrlAssetId(
  url: string,
  rulesetId: string | null,
  urlToAssetIdMap: Record<string, string>,
): Promise<string | null> {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  const existing = urlToAssetIdMap[trimmed];
  if (existing) return existing;
  const id = await createUrlAssetForImport(trimmed, rulesetId);
  urlToAssetIdMap[trimmed] = id;
  return id;
}

export interface ImportRulesetOptions {
  /** When true, replace an existing ruleset with the same id if the uploaded version is higher */
  replaceIfNewer?: boolean;
  /** When true, and the uploaded ruleset matches an existing ruleset id+version, create a new ruleset by duplicating the existing one */
  duplicateAsNew?: boolean;
  /** Optional new title to use when creating a duplicate ruleset */
  duplicateTitle?: string;
  /** Optional new version to use when creating a duplicate ruleset */
  duplicateVersion?: string;
  /** When set, import content only into this ruleset id (ruleset must already exist). Skips ruleset creation and version checks. Used for add-module-from-zip. */
  contentOnlyIntoRulesetId?: string;
}

export interface ImportRulesetResult {
  success: boolean;
  message: string;
  /** When the uploaded ruleset has the same id but higher version; caller should prompt and re-call with replaceIfNewer: true */
  needsReplaceConfirmation?: boolean;
  /** When the uploaded ruleset has the same id and same version; caller should prompt for duplicate-as-new */
  needsDuplicateConfirmation?: boolean;
  existingRuleset?: Ruleset;
  importedRuleset?: Ruleset;
  importedCounts: {
    attributes: number;
    actions: number;
    items: number;
    charts: number;
    characters: number;
    windows: number;
    components: number;
    composites: number;
    compositeVariants: number;
    assets: number;
    fonts: number;
    documents: number;
    archetypes: number;
    customProperties: number;
    archetypeCustomProperties: number;
    itemCustomProperties: number;
    characterAttributes: number;
    inventories: number;
    characterWindows: number;
    characterPages: number;
    rulesetWindows: number;
    inventoryItems: number;
    scripts: number;
    campaigns: number;
    campaignScenes: number;
    campaignCharacters: number;
    campaignEvents: number;
    sceneTurnCallbacks: number;
  };
  errors: string[];
}

interface ImportedMetadata {
  ruleset: {
    id: string;
    title: string;
    description: string;
    version: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    details: Record<string, any>;
    /** Cover image asset id (file- or URL-backed); preserved across export/import. */
    assetId?: string | null;
    image: string | null;
    isModule: boolean;
    palette?: string[];
    charactersCtaAssetId?: string | null;
    campaignsCtaAssetId?: string | null;
    characterCtaTitle?: string | null;
    characterCtaDescription?: string | null;
    campaignsCtaTitle?: string | null;
    campaignCtaDescription?: string | null;
  };
  exportInfo: {
    exportedAt: string;
    exportedBy: string;
    /** Quest Bound app version at export time. */
    version: string;
  };
  counts: {
    attributes: number;
    actions: number;
    items: number;
    charts: number;
    characters: number;
    windows: number;
    components: number;
    composites?: number;
    compositeVariants?: number;
    assets: number;
    fonts: number;
    documents: number;
    characterAttributes: number;
    characterInventories: number;
    characterWindows: number;
    characterPages?: number;
    rulesetWindows?: number;
    inventoryItems?: number;
    scripts?: number;
    customProperties?: number;
    archetypeCustomProperties?: number;
    itemCustomProperties?: number;
    campaigns?: number;
    campaignScenes?: number;
    campaignCharacters?: number;
    campaignEvents?: number;
    sceneTurnCallbacks?: number;
  };
  scripts?: ScriptMetadata[];
}

/** Injected at read time by asset middleware; must not be persisted on the ruleset row. */
function stripInjectedRulesetReadFields(r: Ruleset): Ruleset {
  const o = { ...(r as Record<string, unknown>) };
  delete o.charactersCtaImage;
  delete o.campaignsCtaImage;
  delete o.image;
  return o as Ruleset;
}

function pickImportedMetadataField(
  o: Record<string, unknown>,
  canonical: string,
): unknown {
  if (canonical in o) return o[canonical];
  const lower = canonical.toLowerCase();
  for (const k of Object.keys(o)) {
    if (k.toLowerCase() === lower) return o[k];
  }
  return undefined;
}

function trimmedStringOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t !== '' ? t : null;
  }
  return null;
}

/**
 * Landing-page CTA fields from metadata.json `ruleset` (case-insensitive keys; trims asset ids).
 * Export may duplicate keys or use injected `*CtaImage` blobs on the same object — we only read id/title fields.
 */
function landingCtaFromImportedMetadata(
  rs: ImportedMetadata['ruleset'] | Record<string, unknown> | undefined | null,
): Pick<
  Ruleset,
  | 'charactersCtaAssetId'
  | 'campaignsCtaAssetId'
  | 'characterCtaTitle'
  | 'characterCtaDescription'
  | 'campaignsCtaTitle'
  | 'campaignCtaDescription'
> {
  const empty = {
    charactersCtaAssetId: null as string | null,
    campaignsCtaAssetId: null as string | null,
    characterCtaTitle: null as string | null,
    characterCtaDescription: null as string | null,
    campaignsCtaTitle: null as string | null,
    campaignCtaDescription: null as string | null,
  };
  if (!rs || typeof rs !== 'object') return empty;

  const o = rs as Record<string, unknown>;

  const text = (v: unknown): string | null => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string') return v;
    return null;
  };

  return {
    charactersCtaAssetId:
      trimmedStringOrNull(pickImportedMetadataField(o, 'charactersCtaAssetId')) ??
      trimmedStringOrNull(pickImportedMetadataField(o, 'characterCtaAssetId')) ??
      trimmedStringOrNull(pickImportedMetadataField(o, 'characters_cta_asset_id')),
    campaignsCtaAssetId:
      trimmedStringOrNull(pickImportedMetadataField(o, 'campaignsCtaAssetId')) ??
      trimmedStringOrNull(pickImportedMetadataField(o, 'campaignCtaAssetId')) ??
      trimmedStringOrNull(pickImportedMetadataField(o, 'campaigns_cta_asset_id')),
    characterCtaTitle: text(pickImportedMetadataField(o, 'characterCtaTitle')),
    characterCtaDescription: text(pickImportedMetadataField(o, 'characterCtaDescription')),
    campaignsCtaTitle: text(pickImportedMetadataField(o, 'campaignsCtaTitle')),
    campaignCtaDescription: text(pickImportedMetadataField(o, 'campaignCtaDescription')),
  };
}

/**
 * Merge landing CTA ids + copy from zip metadata onto the ruleset row.
 * Uses put(get+merge) instead of update(): Dexie update/modify skips keys when old === new and can no-op if no row matched.
 */
async function persistRulesetLandingCtaFromMetadata(
  rulesetId: string,
  rulesetMeta: ImportedMetadata['ruleset'],
): Promise<void> {
  const row = await db.rulesets.get(rulesetId);
  if (!row) return;

  const cta = landingCtaFromImportedMetadata(rulesetMeta);
  const base = stripInjectedRulesetReadFields(row);
  const now = new Date().toISOString();

  await db.rulesets.put({
    ...base,
    ...cta,
    updatedAt: now,
  });
}

export const useImportRuleset = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState<string | null>(null);
  const { handleError } = useErrorHandler();
  const { createRuleset } = useRulesets();

  const validateMetadata = (metadata: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!metadata.ruleset) {
      errors.push('Metadata must contain ruleset information');
      return { isValid: false, errors };
    }

    if (!metadata.ruleset.title || typeof metadata.ruleset.title !== 'string') {
      errors.push('Ruleset title is required');
    }

    // if (!metadata.ruleset.description || typeof metadata.ruleset.description !== 'string') {
    //   errors.push('Ruleset description is required');
    // }

    if (!metadata.ruleset.version || typeof metadata.ruleset.version !== 'string') {
      errors.push('Ruleset version is required');
    }

    return { isValid: errors.length === 0, errors };
  };

  const validateData = (
    data: any[],
    type:
      | 'attributes'
      | 'actions'
      | 'items'
      | 'charts'
      | 'characters'
      | 'windows'
      | 'components'
      | 'composites'
      | 'compositeVariants'
      | 'assets'
      | 'fonts'
      | 'documents'
      | 'characterAttributes'
      | 'inventories'
      | 'characterWindows'
      | 'characterPages'
      | 'rulesetPages'
      | 'rulesetWindows'
      | 'pages'
      | 'inventoryItems'
      | 'customProperties'
      | 'archetypeCustomProperties'
      | 'itemCustomProperties',
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push(`${type} data must be an array`);
      return { isValid: false, errors };
    }

    data.forEach((item, index) => {
      // Type-specific validation
      switch (type) {
        case 'attributes':
          if (!item.title || typeof item.title !== 'string') {
            errors.push(`${type} ${index + 1}: title is required and must be a string`);
          }
          if (!item.type || !['string', 'number', 'boolean', 'list'].includes(item.type)) {
            errors.push(
              `Attribute ${index + 1}: type must be one of: string, number, boolean, list`,
            );
          }
          if (item.defaultValue === undefined || item.defaultValue === null) {
            errors.push(`Attribute ${index + 1}: defaultValue is required`);
          }
          if (item.type === 'list' && (!item.options || !Array.isArray(item.options))) {
            errors.push(`Attribute ${index + 1}: options array is required for list type`);
          }
          break;

        case 'items':
          if (!item.title || typeof item.title !== 'string') {
            errors.push(`${type} ${index + 1}: title is required and must be a string`);
          }
          if (typeof item.weight !== 'number') {
            errors.push(`Item ${index + 1}: weight must be a number`);
          }
          if (typeof item.defaultQuantity !== 'number') {
            errors.push(`Item ${index + 1}: defaultQuantity must be a number`);
          }
          if (typeof item.stackSize !== 'number') {
            errors.push(`Item ${index + 1}: stackSize must be a number`);
          }
          if (typeof item.isContainer !== 'boolean') {
            errors.push(`Item ${index + 1}: isContainer must be a boolean`);
          }
          if (typeof item.isStorable !== 'boolean') {
            errors.push(`Item ${index + 1}: isStorable must be a boolean`);
          }
          if (typeof item.isEquippable !== 'boolean') {
            errors.push(`Item ${index + 1}: isEquippable must be a boolean`);
          }
          if (typeof item.isConsumable !== 'boolean') {
            errors.push(`Item ${index + 1}: isConsumable must be a boolean`);
          }
          // if (typeof item.inventoryWidth !== 'number') {
          //   errors.push(`Item ${index + 1}: inventoryWidth must be a number`);
          // }
          // if (typeof item.inventoryHeight !== 'number') {
          //   errors.push(`Item ${index + 1}: inventoryHeight must be a number`);
          // }
          break;

        case 'actions':
          // Actions only require title and description, which are already validated above
          if (!item.title || typeof item.title !== 'string') {
            errors.push(`${type} ${index + 1}: title is required and must be a string`);
          }
          break;

        case 'charts':
          if (!item.title || typeof item.title !== 'string') {
            errors.push(`${type} ${index + 1}: title is required and must be a string`);
          }
          if (!item.data || typeof item.data !== 'string') {
            errors.push(`Chart ${index + 1}: data is required and must be a string`);
          }
          break;

        case 'customProperties':
          if (!item.id || typeof item.id !== 'string') {
            errors.push(`CustomProperty ${index + 1}: id is required and must be a string`);
          }
          if (!item.label || typeof item.label !== 'string') {
            errors.push(`CustomProperty ${index + 1}: label is required and must be a string`);
          }
          if (
            !item.type ||
            !['string', 'number', 'boolean', 'color', 'image'].includes(item.type)
          ) {
            errors.push(
              `CustomProperty ${index + 1}: type must be one of: string, number, boolean, color, image`,
            );
          }
          break;

        case 'archetypeCustomProperties':
          if (!item.archetypeId || typeof item.archetypeId !== 'string') {
            errors.push(
              `ArchetypeCustomProperty ${index + 1}: archetypeId is required and must be a string`,
            );
          }
          if (!item.customPropertyId || typeof item.customPropertyId !== 'string') {
            errors.push(
              `ArchetypeCustomProperty ${index + 1}: customPropertyId is required and must be a string`,
            );
          }
          break;

        case 'itemCustomProperties':
          if (!item.itemId || typeof item.itemId !== 'string') {
            errors.push(`ItemCustomProperty ${index + 1}: itemId is required and must be a string`);
          }
          if (!item.customPropertyId || typeof item.customPropertyId !== 'string') {
            errors.push(
              `ItemCustomProperty ${index + 1}: customPropertyId is required and must be a string`,
            );
          }
          break;

        case 'characters':
          if (!item.name || typeof item.name !== 'string') {
            errors.push(`Character ${index + 1}: name is required and must be a string`);
          }
          if (typeof item.isTestCharacter !== 'boolean') {
            errors.push(`Character ${index + 1}: isTestCharacter must be a boolean`);
          }
          break;

        case 'windows':
          if (!item.title || typeof item.title !== 'string') {
            errors.push(`${type} ${index + 1}: title is required and must be a string`);
          }
          break;

        case 'components':
          if (!item.windowId || typeof item.windowId !== 'string') {
            errors.push(`${type} ${index + 1}: windowId is required and must be a string`);
          }
          if (!item.type || typeof item.type !== 'string') {
            errors.push(`${type} ${index + 1}: type is required and must be a string`);
          }
          if (typeof item.x !== 'number') {
            errors.push(`Component ${index + 1}: x must be a number`);
          }
          if (typeof item.y !== 'number') {
            errors.push(`Component ${index + 1}: y must be a number`);
          }
          if (typeof item.z !== 'number') {
            errors.push(`Component ${index + 1}: z must be a number`);
          }
          if (typeof item.height !== 'number') {
            errors.push(`Component ${index + 1}: height must be a number`);
          }
          if (typeof item.width !== 'number') {
            errors.push(`Component ${index + 1}: width must be a number`);
          }
          if (typeof item.rotation !== 'number') {
            errors.push(`Component ${index + 1}: rotation must be a number`);
          }
          break;

        case 'composites':
          if (!item.name || typeof item.name !== 'string') {
            errors.push(`Composite ${index + 1}: name is required and must be a string`);
          }
          if (!item.rootComponentId || typeof item.rootComponentId !== 'string') {
            errors.push(`Composite ${index + 1}: rootComponentId is required and must be a string`);
          }
          break;

        case 'compositeVariants':
          if (!item.compositeId || typeof item.compositeId !== 'string') {
            errors.push(
              `CompositeVariant ${index + 1}: compositeId is required and must be a string`,
            );
          }
          if (!item.groupComponentId || typeof item.groupComponentId !== 'string') {
            errors.push(
              `CompositeVariant ${index + 1}: groupComponentId is required and must be a string`,
            );
          }
          if (!item.name || typeof item.name !== 'string') {
            errors.push(`CompositeVariant ${index + 1}: name is required and must be a string`);
          }
          break;

        case 'assets':
          if (typeof item.data !== 'string') {
            errors.push(`Asset ${index + 1}: data must be a string`);
          }
          if (!item.type || typeof item.type !== 'string') {
            errors.push(`Asset ${index + 1}: type is required and must be a string`);
          }
          if (!item.filename || typeof item.filename !== 'string') {
            errors.push(`Asset ${index + 1}: filename is required and must be a string`);
          }
          break;

        case 'fonts':
          if (!item.label || typeof item.label !== 'string') {
            errors.push(`Font ${index + 1}: label is required and must be a string`);
          }
          if (!item.data || typeof item.data !== 'string') {
            errors.push(`Font ${index + 1}: data is required and must be a string`);
          }
          break;

        case 'documents':
          if (!item.title || typeof item.title !== 'string') {
            errors.push(`Document ${index + 1}: title is required and must be a string`);
          }
          if (item.order != null && typeof item.order !== 'number') {
            errors.push(`Document ${index + 1}: order must be a number when present`);
          }
          break;

        case 'characterAttributes':
          if (!item.characterId || typeof item.characterId !== 'string') {
            errors.push(
              `CharacterAttribute ${index + 1}: characterId is required and must be a string`,
            );
          }
          if (!item.attributeId || typeof item.attributeId !== 'string') {
            errors.push(
              `CharacterAttribute ${index + 1}: attributeId is required and must be a string`,
            );
          }
          break;

        case 'inventories':
          if (!item.characterId || typeof item.characterId !== 'string') {
            errors.push(`Inventory ${index + 1}: characterId is required and must be a string`);
          }
          break;

        case 'characterWindows':
          if (!item.characterId || typeof item.characterId !== 'string') {
            errors.push(
              `CharacterWindow ${index + 1}: characterId is required and must be a string`,
            );
          }
          if (!item.windowId || typeof item.windowId !== 'string') {
            errors.push(`CharacterWindow ${index + 1}: windowId is required and must be a string`);
          }
          break;

        case 'characterPages':
          if (!item.characterId || typeof item.characterId !== 'string') {
            errors.push(`CharacterPage ${index + 1}: characterId is required and must be a string`);
          }
          // pageId may be '' for blank pages (see useCharacterPages create from label); only reject missing/non-string
          if (
            item.pageId === undefined ||
            item.pageId === null ||
            typeof item.pageId !== 'string'
          ) {
            errors.push(`CharacterPage ${index + 1}: pageId is required and must be a string`);
          }
          if (
            item.sheetFitToViewport !== undefined &&
            typeof item.sheetFitToViewport !== 'boolean'
          ) {
            errors.push(
              `CharacterPage ${index + 1}: sheetFitToViewport must be a boolean when present`,
            );
          }
          break;

        case 'rulesetWindows':
          if (!item.rulesetId || typeof item.rulesetId !== 'string') {
            errors.push(`RulesetWindow ${index + 1}: rulesetId is required and must be a string`);
          }
          if (!item.windowId || typeof item.windowId !== 'string') {
            errors.push(`RulesetWindow ${index + 1}: windowId is required and must be a string`);
          }
          if (!item.title || typeof item.title !== 'string') {
            errors.push(`RulesetWindow ${index + 1}: title is required and must be a string`);
          }
          if (typeof item.x !== 'number') {
            errors.push(`RulesetWindow ${index + 1}: x must be a number`);
          }
          if (typeof item.y !== 'number') {
            errors.push(`RulesetWindow ${index + 1}: y must be a number`);
          }
          if (typeof item.isCollapsed !== 'boolean') {
            errors.push(`RulesetWindow ${index + 1}: isCollapsed must be a boolean`);
          }
          break;

        case 'pages':
          if (!item.label || typeof item.label !== 'string') {
            errors.push(`Page ${index + 1}: label is required and must be a string`);
          }
          if (item.order !== undefined && typeof item.order !== 'number') {
            errors.push(`Page ${index + 1}: order must be a number when present`);
          }
          break;

        case 'inventoryItems':
          if (!item.inventoryId || typeof item.inventoryId !== 'string') {
            errors.push(`InventoryItem ${index + 1}: inventoryId is required and must be a string`);
          }
          if (!item.entityId || typeof item.entityId !== 'string') {
            errors.push(`InventoryItem ${index + 1}: entityId is required and must be a string`);
          }
          if (typeof item.quantity !== 'number') {
            errors.push(`InventoryItem ${index + 1}: quantity must be a number`);
          }
          break;
      }
    });

    return { isValid: errors.length === 0, errors };
  };

  const importRuleset = async (
    file: File,
    options?: ImportRulesetOptions,
  ): Promise<ImportRulesetResult> => {
    setIsImporting(true);
    setImportStep('Initializing');
    await Promise.resolve();
    setImportStep('Reading zip file');

    try {
      // Parse the zip file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      // Detect optional root folder: QB export has paths at zip root (e.g. "application data/metadata.json").
      // Manually zipping a folder yields paths under that folder (e.g. "MyFolder/application data/metadata.json").
      const METADATA_PATH = 'application data/metadata.json';
      let pathPrefix = '';
      let metadataFile = zipContent.file(METADATA_PATH);
      if (!metadataFile) {
        const key = Object.keys(zipContent.files).find((p) => p.endsWith(METADATA_PATH));
        if (key) {
          pathPrefix = key.slice(0, -METADATA_PATH.length);
          metadataFile = zipContent.file(key) ?? null;
        }
      }
      const getZipFile = (path: string) =>
        zipContent.file(path) ?? (pathPrefix ? zipContent.file(pathPrefix + path) : null);

      if (!metadataFile) {
        return {
          success: false,
          message:
            'Invalid zip file: application data/metadata.json not found. If you zipped a folder manually, zip the folder contents (so "application data" is at the root of the archive) rather than the folder itself.',
          importedCounts: {
            attributes: 0,
            actions: 0,
            items: 0,
            charts: 0,
            characters: 0,
            windows: 0,
            components: 0,
            composites: 0,
            compositeVariants: 0,
            assets: 0,
            fonts: 0,
            documents: 0,
            archetypes: 0,
            customProperties: 0,
            archetypeCustomProperties: 0,
            itemCustomProperties: 0,
            characterAttributes: 0,
            inventories: 0,
            characterWindows: 0,
            characterPages: 0,
            rulesetWindows: 0,
            inventoryItems: 0,
            scripts: 0,
            campaigns: 0,
            campaignScenes: 0,
            campaignCharacters: 0,
            campaignEvents: 0,
            sceneTurnCallbacks: 0,
          },
          errors: [
            'application data/metadata.json file is required. When manually zipping, compress the contents of the export folder so that "application data" appears at the root of the zip.',
          ],
        };
      }

      const metadataText = await metadataFile.async('text');
      const metadata: ImportedMetadata = JSON.parse(metadataText);

      setImportStep('Validating metadata');

      // Validate metadata
      const metadataValidation = validateMetadata(metadata);
      if (!metadataValidation.isValid) {
        return {
          success: false,
          message: `Metadata validation failed: ${metadataValidation.errors.length} errors found`,
          importedCounts: {
            attributes: 0,
            actions: 0,
            items: 0,
            charts: 0,
            characters: 0,
            windows: 0,
            components: 0,
            composites: 0,
            compositeVariants: 0,
            assets: 0,
            fonts: 0,
            documents: 0,
            archetypes: 0,
            customProperties: 0,
            archetypeCustomProperties: 0,
            itemCustomProperties: 0,
            characterAttributes: 0,
            inventories: 0,
            characterWindows: 0,
            characterPages: 0,
            rulesetWindows: 0,
            inventoryItems: 0,
            scripts: 0,
            campaigns: 0,
            campaignScenes: 0,
            campaignCharacters: 0,
            campaignEvents: 0,
            sceneTurnCallbacks: 0,
          },
          errors: metadataValidation.errors,
        };
      }

      const now = new Date().toISOString();
      let newRulesetId = metadata.ruleset.id;

      // Build asset maps early so we can reuse URL asset ids and avoid importing URL-backed assets twice
      const assetFilenameToIdMap: Record<string, string> = {};
      const urlToAssetIdMap: Record<string, string> = {};
      const assetsMetadataFileForMaps = getZipFile('application data/assets.json');
      if (assetsMetadataFileForMaps) {
        try {
          const assetsMetadataText = await assetsMetadataFileForMaps.async('text');
          const assetsMetadataForMap: (Omit<Asset, 'data'> & { data?: string })[] =
            JSON.parse(assetsMetadataText);
          for (const assetMeta of assetsMetadataForMap) {
            let fullPath = assetMeta.filename;
            if (assetMeta.directory) {
              const directoryPath = assetMeta.directory.replace(/^\/+|\/+$/g, '');
              if (directoryPath) {
                fullPath = `${directoryPath}/${assetMeta.filename}`;
              }
            }
            assetFilenameToIdMap[fullPath] = assetMeta.id;
            if (typeof assetMeta.data === 'string' && isUrl(assetMeta.data)) {
              urlToAssetIdMap[assetMeta.data] = assetMeta.id;
            }
          }
        } catch {
          // If we can't read asset metadata, continue without the maps
        }
      }

      const rulesetMetaObj =
        metadata.ruleset && typeof metadata.ruleset === 'object'
          ? (metadata.ruleset as Record<string, unknown>)
          : null;
      const rulesetCoverFromMetadataId = rulesetMetaObj
        ? trimmedStringOrNull(pickImportedMetadataField(rulesetMetaObj, 'assetId'))
        : null;
      const rulesetImage = metadata.ruleset.image as string | null | undefined;
      const rulesetCoverAssetId =
        rulesetCoverFromMetadataId ??
        (rulesetImage && isUrl(rulesetImage.trim())
          ? await getOrCreateUrlAssetId(rulesetImage.trim(), newRulesetId, urlToAssetIdMap)
          : null);

      const landingCta = landingCtaFromImportedMetadata(metadata.ruleset);

      const newRuleset: Ruleset = {
        id: newRulesetId,
        title: metadata.ruleset.title,
        description: metadata.ruleset.description,
        version: metadata.ruleset.version,
        createdBy: metadata.ruleset.createdBy,
        details: metadata.ruleset.details || {},
        isModule: metadata.ruleset.isModule || false,
        assetId: rulesetCoverAssetId,
        createdAt: now,
        updatedAt: now,
        palette: Array.isArray(metadata.ruleset.palette) ? metadata.ruleset.palette : [],
        ...landingCta,
      };

      // Content-only import: fill an existing ruleset (e.g. temp ruleset for add-module-from-zip)
      if (options?.contentOnlyIntoRulesetId) {
        newRulesetId = options.contentOnlyIntoRulesetId;
        const existing = await db.rulesets.get(newRulesetId);
        if (!existing) {
          await db.rulesets.add({ ...newRuleset, id: newRulesetId });
        }
        // Fall through to "Import content files" (skip existing ruleset version check)
      } else {
        // Check for existing ruleset with same id
        const existingRuleset = await db.rulesets.get(newRulesetId);
        if (existingRuleset) {
          if (existingRuleset.version === newRuleset.version) {
            // Same id and version: either request duplicate-as-new confirmation or perform duplication
            if (options?.duplicateAsNew) {
              const duplicateTitle = options.duplicateTitle?.trim() || `${newRuleset.title} (copy)`;
              const duplicateVersion = options.duplicateVersion?.trim() || newRuleset.version;

              // Create the new ruleset record
              const newId = await createRuleset({
                title: duplicateTitle,
                description: newRuleset.description,
                version: duplicateVersion,
                details: newRuleset.details || {},
                assetId: newRuleset.assetId ?? null,
                createdBy: newRuleset.createdBy,
              });

              // Duplicate all entities from the existing ruleset into the new one
              const duplicationCounts = await duplicateRuleset({
                sourceRulesetId: existingRuleset.id,
                targetRulesetId: newId,
              });

              const duplicatedRuleset = await db.rulesets.get(newId);

              return {
                success: true,
                message: `Created duplicate ruleset "${duplicatedRuleset?.title ?? duplicateTitle}" (v${duplicatedRuleset?.version ?? duplicateVersion}).`,
                importedRuleset: duplicatedRuleset ?? undefined,
                importedCounts: duplicationCounts,
                errors: [],
              };
            }

            return {
              success: false,
              message: `A ruleset "${existingRuleset.title}" (v${existingRuleset.version}) already exists with the same id and version. You can create a new copy with a different title and version.`,
              needsDuplicateConfirmation: true,
              existingRuleset,
              importedRuleset: newRuleset,
              importedCounts: {
                attributes: 0,
                actions: 0,
                items: 0,
                charts: 0,
                characters: 0,
                windows: 0,
                components: 0,
                composites: 0,
                compositeVariants: 0,
                assets: 0,
                fonts: 0,
                documents: 0,
                archetypes: 0,
                customProperties: 0,
                archetypeCustomProperties: 0,
                itemCustomProperties: 0,
                characterAttributes: 0,
                inventories: 0,
                characterWindows: 0,
                characterPages: 0,
                rulesetWindows: 0,
                inventoryItems: 0,
                scripts: 0,
                campaigns: 0,
                campaignScenes: 0,
                campaignCharacters: 0,
                campaignEvents: 0,
                sceneTurnCallbacks: 0,
              },
              errors: ['Duplicate ruleset: same id and version as an existing ruleset'],
            };
          }
          if (compareVersion(newRuleset.version, existingRuleset.version) > 0) {
            // Uploaded version is higher: prompt to replace unless already confirmed
            if (!options?.replaceIfNewer) {
              return {
                success: false,
                message: `A ruleset "${existingRuleset.title}" (v${existingRuleset.version}) already exists with the same id. The uploaded file is a newer version (v${newRuleset.version}). Replacing will remove the existing ruleset and all its data, and replace it with the uploaded version.`,
                needsReplaceConfirmation: true,
                existingRuleset,
                importedRuleset: newRuleset,
                importedCounts: {
                  attributes: 0,
                  actions: 0,
                  items: 0,
                  charts: 0,
                  characters: 0,
                  windows: 0,
                  components: 0,
                  composites: 0,
                  compositeVariants: 0,
                  assets: 0,
                  fonts: 0,
                  documents: 0,
                  archetypes: 0,
                  customProperties: 0,
                  archetypeCustomProperties: 0,
                  itemCustomProperties: 0,
                  characterAttributes: 0,
                  inventories: 0,
                  characterWindows: 0,
                  characterPages: 0,
                  rulesetWindows: 0,
                  inventoryItems: 0,
                  scripts: 0,
                  campaigns: 0,
                  campaignScenes: 0,
                  campaignCharacters: 0,
                  campaignEvents: 0,
                  sceneTurnCallbacks: 0,
                },
                errors: [],
              };
            }
            await deleteRulesetAndRelatedData(newRulesetId);
          } else {
            // Uploaded version is lower or equal (same already handled above): reject
            return {
              success: false,
              message: `A ruleset "${existingRuleset.title}" (v${existingRuleset.version}) already exists with the same id. The uploaded file is an older or same version (v${newRuleset.version}). Import aborted.`,
              existingRuleset,
              importedCounts: {
                attributes: 0,
                actions: 0,
                items: 0,
                charts: 0,
                characters: 0,
                windows: 0,
                components: 0,
                composites: 0,
                compositeVariants: 0,
                assets: 0,
                fonts: 0,
                documents: 0,
                archetypes: 0,
                customProperties: 0,
                archetypeCustomProperties: 0,
                itemCustomProperties: 0,
                characterAttributes: 0,
                inventories: 0,
                characterWindows: 0,
                characterPages: 0,
                rulesetWindows: 0,
                inventoryItems: 0,
                scripts: 0,
                campaigns: 0,
                campaignScenes: 0,
                campaignCharacters: 0,
                campaignEvents: 0,
                sceneTurnCallbacks: 0,
              },
              errors: ['Existing ruleset has same or newer version'],
            };
          }
        }
      }

      // Import content files
      const importedCounts = {
        attributes: 0,
        actions: 0,
        items: 0,
        charts: 0,
        characters: 0,
        windows: 0,
        components: 0,
        composites: 0,
        compositeVariants: 0,
        assets: 0,
        fonts: 0,
        documents: 0,
        archetypes: 0,
        customProperties: 0,
        archetypeCustomProperties: 0,
        itemCustomProperties: 0,
        characterAttributes: 0,
        inventories: 0,
        characterWindows: 0,
        characterPages: 0,
        rulesetPages: 0,
        rulesetWindows: 0,
        inventoryItems: 0,
        scripts: 0,
        campaigns: 0,
        campaignScenes: 0,
        campaignCharacters: 0,
        campaignEvents: 0,
        sceneTurnCallbacks: 0,
      };

      const allErrors: string[] = [];

      setImportStep('Importing attributes');

      // Import characterAttributes
      const characterAttributesFile = getZipFile('application data/characterAttributes.json');
      if (characterAttributesFile) {
        try {
          const characterAttributesText = await characterAttributesFile.async('text');
          const characterAttributes: CharacterAttribute[] = JSON.parse(characterAttributesText);

          const validation = validateData(characterAttributes, 'characterAttributes');
          if (validation.isValid) {
            const toAdd: CharacterAttribute[] = characterAttributes.map((ca) => ({
              ...ca,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.characterAttributes, toAdd);
            importedCounts.characterAttributes = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import characterAttributes: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import attributes (TSV format)
      const attributesFile = getZipFile('attributes.tsv');
      if (attributesFile) {
        try {
          const attributesText = await attributesFile.async('text');
          const rows = parseTsv(attributesText);
          const parsedAttributes = tsvToObjects(rows, ATTRIBUTE_FIELD_TYPES);

          // Convert to proper Attribute objects, resolving assetFilename → assetId (same as actions/items)
          const attributes: Attribute[] = parsedAttributes.map((item) => {
            const assetFilename = item.assetFilename as string | undefined;
            const resolvedAssetId = assetFilename ? assetFilenameToIdMap[assetFilename] : undefined;

            return {
              id: item.id as string,
              title: item.title as string,
              description: (item.description as string) ?? '',
              category: item.category as string | undefined,
              type: item.type as Attribute['type'],
              options: item.options as string[] | undefined,
              defaultValue: convertAttributeDefaultValue(item),
              optionsChartRef: item.optionsChartRef as number | undefined,
              optionsChartColumnHeader: item.optionsChartColumnHeader as string | undefined,
              min: item.min as number | undefined,
              max: item.max as number | undefined,
              assetId: resolvedAssetId || null,
              image: (item.image as string)?.trim() || null,
              customProperties:
                item.customProperties != null && String(item.customProperties).trim() !== ''
                  ? String(item.customProperties)
                  : undefined,
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            };
          });

          const validation = validateData(attributes, 'attributes');
          if (validation.isValid) {
            const toAdd: Attribute[] = [];
            for (const attribute of attributes) {
              const rec = { ...attribute };
              if (rec.image && isUrl(rec.image) && !rec.assetId) {
                const id = await getOrCreateUrlAssetId(rec.image, newRulesetId, urlToAssetIdMap);
                if (id) {
                  rec.assetId = id;
                  rec.image = undefined;
                }
              }
              toAdd.push(rec);
            }
            await bulkAddInChunks(db.attributes, toAdd);
            importedCounts.attributes = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import attributes: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      setImportStep('Importing actions');

      // Import actions (TSV format)
      const actionsFile = getZipFile('actions.tsv');
      if (actionsFile) {
        try {
          const actionsText = await actionsFile.async('text');
          const rows = parseTsv(actionsText);
          const parsedActions = tsvToObjects(rows, ACTION_FIELD_TYPES);

          // Convert to proper Action objects, resolving assetFilename to assetId
          const actions: Action[] = parsedActions.map((item) => {
            const assetFilename = item.assetFilename as string | undefined;
            const assetId = assetFilename ? assetFilenameToIdMap[assetFilename] : undefined;

            return {
              id: item.id as string,
              title: item.title as string,
              description: (item.description as string) ?? '',
              category: item.category as string | undefined,
              assetId: assetId || null,
              image: (item.image as string)?.trim() || null,
              customProperties:
                item.customProperties != null && String(item.customProperties).trim() !== ''
                  ? String(item.customProperties)
                  : undefined,
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            };
          });

          const validation = validateData(actions, 'actions');
          if (validation.isValid) {
            const toAdd: Action[] = [];
            for (const action of actions) {
              const rec = { ...action };
              if (rec.image && isUrl(rec.image) && !rec.assetId) {
                const id = await getOrCreateUrlAssetId(rec.image, newRulesetId, urlToAssetIdMap);
                if (id) {
                  rec.assetId = id;
                  rec.image = undefined;
                }
              }
              toAdd.push(rec);
            }
            await bulkAddInChunks(db.actions, toAdd);
            importedCounts.actions = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import actions: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      setImportStep('Importing items');

      // Import items (TSV format)
      const itemsFile = getZipFile('items.tsv');
      if (itemsFile) {
        try {
          const itemsText = await itemsFile.async('text');
          const rows = parseTsv(itemsText);
          const parsedItems = tsvToObjects(rows, ITEM_FIELD_TYPES);

          // Convert to proper Item objects with defaults, resolving assetFilename to assetId
          const items: Item[] = parsedItems.map((item) => {
            const assetFilename = item.assetFilename as string | undefined;
            const assetId = assetFilename ? assetFilenameToIdMap[assetFilename] : undefined;

            return {
              id: item.id as string,
              title: item.title as string,
              description: (item.description as string) ?? '',
              category: item.category as string | undefined,
              weight: (item.weight as number) ?? 0,
              defaultQuantity: (item.defaultQuantity as number) ?? 1,
              stackSize: (item.stackSize as number) ?? 1,
              isContainer: (item.isContainer as boolean) ?? false,
              isStorable: (item.isStorable as boolean) ?? true,
              isEquippable: (item.isEquippable as boolean) ?? false,
              isConsumable: (item.isConsumable as boolean) ?? false,
              inventoryWidth: (item.inventoryWidth as number) ?? 1,
              inventoryHeight: (item.inventoryHeight as number) ?? 1,
              assetId: assetId || null,
              image: (item.image as string)?.trim() || null,
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            };
          });

          const validation = validateData(items, 'items');
          if (validation.isValid) {
            const toAdd: Item[] = [];
            for (const item of items) {
              const rec = { ...item };
              if (rec.image && isUrl(rec.image) && !rec.assetId) {
                const id = await getOrCreateUrlAssetId(rec.image, newRulesetId, urlToAssetIdMap);
                if (id) {
                  rec.assetId = id;
                  rec.image = undefined;
                }
              }
              toAdd.push(rec);
            }
            await bulkAddInChunks(db.items, toAdd);
            importedCounts.items = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import items: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      setImportStep('Importing charts');

      // Import charts (metadata from JSON, data from TSV files in charts folder)
      const chartsFile = getZipFile('application data/charts.json');
      if (chartsFile) {
        try {
          const chartsText = await chartsFile.async('text');
          const chartsMetadata: Omit<Chart, 'data'>[] = JSON.parse(chartsText);

          // Load chart data from TSV files in charts folder
          const chartDataMap: Record<string, string> = {};
          const chartsFolder = zipContent.folder('charts');

          if (chartsFolder) {
            const chartsPrefix = pathPrefix + 'charts/';
            const chartFiles = Object.entries(zipContent.files).filter(
              ([path]) => path.startsWith(chartsPrefix) && path.endsWith('.tsv'),
            );

            for (const [path, file] of chartFiles) {
              // Extract chart ID from filename (format: charts/{title}_{id}.tsv)
              const filename = path.replace(chartsPrefix, '');
              // Parse ID from curly braces: {title}_{id}.tsv
              const idMatch = filename.match(/\{([^}]+)\}\.tsv$/);
              if (!idMatch) continue;
              const chartId = idMatch[1];

              // Read TSV and convert back to JSON 2D array format
              const tsvContent = await file.async('text');
              const rows = tsvContent
                .split('\n')
                .map((line) => line.replace(/\r/g, '').split('\t'));
              chartDataMap[chartId] = JSON.stringify(rows);
            }
          }

          // Reconstruct charts with their data
          const charts: Chart[] = chartsMetadata.map((metadata) => ({
            ...metadata,
            data: chartDataMap[metadata.id] || '[[]]',
          }));

          const validation = validateData(charts, 'charts');
          if (validation.isValid) {
            const toAdd: Chart[] = [];
            for (const chart of charts) {
              const newChart: Chart = {
                ...chart,
                rulesetId: newRulesetId,
                createdAt: now,
                updatedAt: now,
              };
              if (newChart.image && isUrl(newChart.image) && !newChart.assetId) {
                const id = await getOrCreateUrlAssetId(
                  newChart.image,
                  newRulesetId,
                  urlToAssetIdMap,
                );
                if (id) {
                  newChart.assetId = id;
                  newChart.image = undefined;
                }
              }
              toAdd.push(newChart);
            }
            await bulkAddInChunks(db.charts, toAdd);
            importedCounts.charts = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import charts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import customProperties (ruleset-scoped; legacy exports may not have this file)
      const customPropertiesFile = getZipFile('application data/customProperties.json');
      if (customPropertiesFile) {
        try {
          const customPropertiesText = await customPropertiesFile.async('text');
          const customPropertiesToImport: CustomProperty[] = JSON.parse(customPropertiesText);

          const validation = validateData(customPropertiesToImport, 'customProperties');
          if (validation.isValid) {
            const toAdd: CustomProperty[] = customPropertiesToImport.map((cp) => ({
              ...cp,
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.customProperties, toAdd);
            importedCounts.customProperties = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import customProperties: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import itemCustomProperties (after items and customProperties; legacy exports may not have this file)
      const itemCustomPropertiesFile = getZipFile('application data/itemCustomProperties.json');
      if (itemCustomPropertiesFile) {
        try {
          const itemCustomPropertiesText = await itemCustomPropertiesFile.async('text');
          const itemCustomPropertiesToImport: ItemCustomProperty[] =
            JSON.parse(itemCustomPropertiesText);

          const validation = validateData(itemCustomPropertiesToImport, 'itemCustomProperties');
          if (validation.isValid) {
            const toAdd: ItemCustomProperty[] = itemCustomPropertiesToImport.map((icp) => ({
              ...icp,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.itemCustomProperties, toAdd);
            importedCounts.itemCustomProperties = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import itemCustomProperties: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      setImportStep('Importing windows');

      // Import windows (must be imported before components since components reference windows)
      const windowsFile = getZipFile('application data/windows.json');
      if (windowsFile) {
        try {
          const windowsText = await windowsFile.async('text');
          const windows: Window[] = JSON.parse(windowsText);

          const validation = validateData(windows, 'windows');
          if (validation.isValid) {
            const toAdd: Window[] = windows.map((w) => ({
              ...w,
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.windows, toAdd);
            importedCounts.windows = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import windows: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      setImportStep('Importing components');

      // Import components (must be imported after windows to map windowIds)
      const componentsFile = getZipFile('application data/components.json');
      if (componentsFile) {
        try {
          const componentsText = await componentsFile.async('text');
          const components: Component[] = JSON.parse(componentsText);

          const validation = validateData(components, 'components');
          if (validation.isValid) {
            const toAdd: Component[] = components.map((c) => ({
              ...c,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.components, toAdd);
            importedCounts.components = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import components: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      setImportStep('Importing composites');

      const compositesFile = getZipFile('application data/composites.json');
      if (compositesFile) {
        try {
          const compositesText = await compositesFile.async('text');
          const composites: Composite[] = JSON.parse(compositesText);
          const validation = validateData(composites, 'composites');
          if (validation.isValid) {
            const toAdd: Composite[] = composites.map((c) => ({
              ...c,
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.composites, toAdd);
            importedCounts.composites = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import composites: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      const compositeVariantsFile = getZipFile('application data/compositeVariants.json');
      if (compositeVariantsFile) {
        try {
          const compositeVariantsText = await compositeVariantsFile.async('text');
          const compositeVariants: CompositeVariant[] = JSON.parse(compositeVariantsText);
          const validation = validateData(compositeVariants, 'compositeVariants');
          if (validation.isValid) {
            const toAdd: CompositeVariant[] = compositeVariants.map((v) => ({
              ...v,
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.compositeVariants, toAdd);
            importedCounts.compositeVariants = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import compositeVariants: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      setImportStep('Importing assets');

      // Import assets (metadata from JSON; data from JSON when URL, else from files in assets folder)
      const assetsFile = getZipFile('application data/assets.json');
      if (assetsFile) {
        try {
          const assetsText = await assetsFile.async('text');
          const assetsMetadata: (Omit<Asset, 'data'> & { data?: string })[] =
            JSON.parse(assetsText);

          // Load asset data from files in assets folder
          const assetDataMap: Record<string, string> = {};

          // Build a map of all asset files by their paths relative to assets/
          const assetsPrefix = pathPrefix + 'assets/';
          const assetFiles = Object.entries(zipContent.files).filter(
            ([path]) => path.startsWith(assetsPrefix) && !path.endsWith('/'),
          );

          for (const [path, file] of assetFiles) {
            // Read file as base64
            const fileData = await file.async('base64');
            // Get relative path within assets folder (e.g., "subdir/image.png" or "image.png")
            const relativePath = path.replace(assetsPrefix, '');
            assetDataMap[relativePath] = fileData;
          }

          // Reconstruct assets with their data (use URL from JSON when present, else from file)
          const assets: Asset[] = assetsMetadata.map((metadata) => {
            const urlFromJson = metadata.data;
            if (typeof urlFromJson === 'string' && isUrl(urlFromJson)) {
              return {
                ...metadata,
                data: urlFromJson,
              };
            }

            // Build the expected path based on directory and filename
            let assetPath = metadata.filename;
            if (metadata.directory) {
              const directoryPath = metadata.directory.replace(/^\/+|\/+$/g, '');
              if (directoryPath) {
                assetPath = `${directoryPath}/${metadata.filename}`;
              }
            }

            // Get the base64 data and reconstruct the data URL
            const base64Data = assetDataMap[assetPath];
            const dataUrl = base64Data ? `data:${metadata.type};base64,${base64Data}` : '';

            return {
              ...metadata,
              data: dataUrl,
            };
          });

          const validation = validateData(assets, 'assets');
          if (validation.isValid) {
            const toAdd: Asset[] = assets.map((a) => ({
              ...a,
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.assets, toAdd, BULK_CHUNK_SIZE_LARGE);
            importedCounts.assets = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import assets: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      setImportStep('Importing fonts');

      // Import fonts (metadata from JSON, data from files in fonts folder)
      const fontsFile = getZipFile('application data/fonts.json');
      if (fontsFile) {
        try {
          const fontsText = await fontsFile.async('text');
          const fontsMetadata: Omit<Font, 'data'>[] = JSON.parse(fontsText);

          // Load font data from files in fonts folder
          const fontDataMap: Record<string, string> = {};
          const fontsFolder = zipContent.folder('fonts');

          if (fontsFolder) {
            const fontsPrefix = pathPrefix + 'fonts/';
            const fontFiles = Object.entries(zipContent.files).filter(
              ([path]) => path.startsWith(fontsPrefix) && path.endsWith('.ttf'),
            );

            for (const [path, file] of fontFiles) {
              // Extract font ID from filename (format: fonts/{label}_{id}.ttf)
              const filename = path.replace(fontsPrefix, '');
              // Parse ID from curly braces: {label}_{id}.ttf
              const idMatch = filename.match(/\{([^}]+)\}\.ttf$/);
              if (!idMatch) continue;
              const fontId = idMatch[1];

              // Read font as base64
              const fontData = await file.async('base64');
              fontDataMap[fontId] = `data:font/ttf;base64,${fontData}`;
            }
          }

          // Reconstruct fonts with their data
          const fonts: Font[] = fontsMetadata.map((metadata) => ({
            ...metadata,
            data: fontDataMap[metadata.id] || '',
          }));

          const validation = validateData(fonts, 'fonts');
          if (validation.isValid) {
            const toAdd: Font[] = fonts.map((f) => ({
              ...f,
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.fonts, toAdd, BULK_CHUNK_SIZE_LARGE);
            importedCounts.fonts = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import fonts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      setImportStep('Importing documents');

      // Import documents
      const documentsFile = getZipFile('application data/documents.json');
      if (documentsFile) {
        try {
          const documentsText = await documentsFile.async('text');
          const documents: Document[] = JSON.parse(documentsText);

          const validation = validateData(documents, 'documents');
          if (validation.isValid) {
            // Get all PDF files from the documents folder
            const documentsFolder = zipContent.folder('documents');
            const pdfFiles: Record<string, string> = {};

            if (documentsFolder) {
              const documentsPrefix = pathPrefix + 'documents/';
              const pdfFileEntries = Object.entries(zipContent.files).filter(
                ([path]) => path.startsWith(documentsPrefix) && path.endsWith('.pdf'),
              );

              for (const [path, file] of pdfFileEntries) {
                // Extract document ID from filename (format: {title}_{id}.pdf)
                const filename = path.replace(documentsPrefix, '');
                const idMatch = filename.match(/_([^_]+)\.pdf$/);
                if (idMatch) {
                  const docId = idMatch[1];
                  // Read PDF as base64
                  const pdfData = await file.async('base64');
                  pdfFiles[docId] = `data:application/pdf;base64,${pdfData}`;
                }
              }
            }

            const toAdd: Document[] = [];
            for (const document of documents) {
              const newDocument: Document = {
                ...document,
                rulesetId: newRulesetId,
                worldId: undefined,
                locationId: undefined,
                campaignId: undefined,
                // Restore pdfData from the PDF file if available
                pdfData: pdfFiles[document.id] || null,
                createdAt: now,
                updatedAt: now,
              };
              if (newDocument.image && isUrl(newDocument.image) && !newDocument.assetId) {
                const id = await getOrCreateUrlAssetId(
                  newDocument.image,
                  newRulesetId,
                  urlToAssetIdMap,
                );
                if (id) {
                  newDocument.assetId = id;
                  newDocument.image = undefined;
                }
              }
              toAdd.push(newDocument);
            }
            await bulkAddInChunks(db.documents, toAdd, BULK_CHUNK_SIZE_LARGE);
            importedCounts.documents = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import characterInventories
      const inventories = getZipFile('application data/inventories.json');
      if (inventories) {
        try {
          const inventoriesText = await inventories.async('text');
          const characterInventories: Inventory[] = JSON.parse(inventoriesText);

          const validation = validateData(characterInventories, 'inventories');
          if (validation.isValid) {
            const toAdd: Inventory[] = characterInventories.map((inv) => ({
              ...inv,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.inventories, toAdd);
            importedCounts.inventories = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import characterInventories: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import characterWindows
      const characterWindowsFile = getZipFile('application data/characterWindows.json');
      if (characterWindowsFile) {
        try {
          const characterWindowsText = await characterWindowsFile.async('text');
          const characterWindows: CharacterWindow[] = JSON.parse(characterWindowsText);

          const validation = validateData(characterWindows, 'characterWindows');
          if (validation.isValid) {
            const toAdd: CharacterWindow[] = characterWindows.map((cw) => ({
              ...cw,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.characterWindows, toAdd);
            importedCounts.characterWindows = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import characterWindows: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import pages (must be before rulesetPages and characterPages; they reference pageId)
      const pagesFile = getZipFile('application data/pages.json');
      if (pagesFile) {
        try {
          const pagesText = await pagesFile.async('text');
          const pagesToImport: Page[] = JSON.parse(pagesText);

          const validation = validateData(pagesToImport, 'pages');
          if (validation.isValid) {
            const toAdd: Page[] = pagesToImport.map((p) => ({
              ...p,
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.pages, toAdd);
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import pages: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Legacy: build rulesetPageId (old join id) -> pageId for rulesetWindows from old exports
      const rulesetPageIdToPageId = new Map<string, string>();
      const rulesetPagesFile = getZipFile('application data/rulesetPages.json');
      if (rulesetPagesFile) {
        try {
          const rulesetPagesText = await rulesetPagesFile.async('text');
          const legacyJoins: { id: string; pageId: string }[] = JSON.parse(rulesetPagesText);
          for (const j of legacyJoins) {
            rulesetPageIdToPageId.set(j.id, j.pageId);
          }
        } catch {
          // Ignore invalid or missing legacy file
        }
      }

      // Import rulesetWindows (require pages and windows to be imported first)
      const rulesetWindowsFile = getZipFile('application data/rulesetWindows.json');
      if (rulesetWindowsFile) {
        try {
          const rulesetWindowsText = await rulesetWindowsFile.async('text');
          const rulesetWindowsToImport: RulesetWindow[] = JSON.parse(rulesetWindowsText);

          const validation = validateData(rulesetWindowsToImport, 'rulesetWindows');
          if (validation.isValid) {
            const toAdd: RulesetWindow[] = rulesetWindowsToImport.map((rw) => {
              const legacyPageId = (rw as { rulesetPageId?: string | null }).rulesetPageId;
              const pageId =
                rw.pageId ??
                (legacyPageId != null ? (rulesetPageIdToPageId.get(legacyPageId) ?? null) : null);
              return {
                ...rw,
                id: crypto.randomUUID(),
                rulesetId: newRulesetId,
                pageId: pageId ?? undefined,
                windowId: rw.windowId,
                createdAt: now,
                updatedAt: now,
              };
            });
            await bulkAddInChunks(db.rulesetWindows, toAdd);
            importedCounts.rulesetWindows = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import rulesetWindows: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import characterPages (full content; map characterId to new id)
      const characterPagesFile = getZipFile('application data/characterPages.json');
      if (characterPagesFile) {
        try {
          const characterPagesText = await characterPagesFile.async('text');
          const characterPagesParsed = JSON.parse(characterPagesText) as unknown;
          if (Array.isArray(characterPagesParsed)) {
            for (const item of characterPagesParsed) {
              if (item !== null && typeof item === 'object') {
                const cp = item as Record<string, unknown>;
                const fit = normalizeImportedSheetFitToViewport(cp.sheetFitToViewport);
                if (fit === undefined) {
                  delete cp.sheetFitToViewport;
                } else {
                  cp.sheetFitToViewport = fit;
                }
              }
            }
          }
          const characterPagesToImport = characterPagesParsed as CharacterPage[];

          const validation = validateData(characterPagesToImport, 'characterPages');
          if (validation.isValid) {
            const toAdd: CharacterPage[] = characterPagesToImport.map((cp) => ({
              ...cp,
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.characterPages, toAdd);
            importedCounts.characterPages = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import characterPages: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import inventoryItems (must be after inventories since they reference inventoryId)
      const inventoryItemsFile = getZipFile('application data/inventoryItems.json');
      if (inventoryItemsFile) {
        try {
          const inventoryItemsText = await inventoryItemsFile.async('text');
          const inventoryItems: InventoryItem[] = JSON.parse(inventoryItemsText);

          const validation = validateData(inventoryItems, 'inventoryItems');
          if (validation.isValid) {
            const toAdd: InventoryItem[] = inventoryItems.map((ii) => ({
              ...ii,
              createdAt: now,
              updatedAt: now,
            }));
            await bulkAddInChunks(db.inventoryItems, toAdd);
            importedCounts.inventoryItems = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import inventoryItems: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      setImportStep('Importing characters');

      // Import characters
      const charactersFile = getZipFile('application data/characters.json');
      if (charactersFile) {
        try {
          const charactersText = await charactersFile.async('text');
          const characters: Character[] = JSON.parse(charactersText);

          const validation = validateData(characters, 'characters');
          if (validation.isValid) {
            const toAdd: Character[] = [];
            for (const character of characters) {
              const newCharacter: Character = {
                ...character,
                rulesetId: newRulesetId,
                createdAt: now,
                updatedAt: now,
              };
              if (newCharacter.image && isUrl(newCharacter.image) && !newCharacter.assetId) {
                const id = await getOrCreateUrlAssetId(
                  newCharacter.image,
                  newRulesetId,
                  urlToAssetIdMap,
                );
                if (id) {
                  newCharacter.assetId = id;
                  newCharacter.image = undefined;
                }
              }
              toAdd.push(newCharacter);
            }
            await bulkAddInChunks(db.characters, toAdd);
            importedCounts.characters = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import characters: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      setImportStep('Importing campaigns');

      // Import campaigns and related data (after characters, since campaignCharacters reference characterId)
      const campaignsFile = getZipFile('application data/campaigns.json');
      if (campaignsFile) {
        try {
          const campaignsText = await campaignsFile.async('text');
          const campaignsToImport: Campaign[] = JSON.parse(campaignsText);
          const campaignIdMap = new Map<string, string>();
          const campaignSceneIdMap = new Map<string, string>();
          const seenCampaignIds = new Set<string>();

          const campaignsToAdd: Campaign[] = [];
          for (const campaign of campaignsToImport) {
            if (seenCampaignIds.has(campaign.id)) continue;
            seenCampaignIds.add(campaign.id);
            const newCampaignId = crypto.randomUUID();
            campaignIdMap.set(campaign.id, newCampaignId);
            const newCampaign: Campaign = {
              ...campaign,
              id: newCampaignId,
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            };
            if (newCampaign.image && isUrl(newCampaign.image) && !newCampaign.assetId) {
              const id = await getOrCreateUrlAssetId(
                newCampaign.image,
                newRulesetId,
                urlToAssetIdMap,
              );
              if (id) {
                newCampaign.assetId = id;
                newCampaign.image = undefined;
              }
            }
            campaignsToAdd.push(newCampaign);
          }
          if (campaignsToAdd.length > 0) {
            await bulkAddInChunks(db.campaigns, campaignsToAdd);
            importedCounts.campaigns = campaignsToAdd.length;
          }

          const campaignScenesFile = getZipFile('application data/campaignScenes.json');
          if (campaignScenesFile) {
            const scenesText = await campaignScenesFile.async('text');
            const scenesToImport: CampaignScene[] = JSON.parse(scenesText);
            const seenSceneIds = new Set<string>();
            const scenesToAdd: CampaignScene[] = [];
            for (const scene of scenesToImport) {
              if (seenSceneIds.has(scene.id)) continue;
              seenSceneIds.add(scene.id);
              const newCampaignId = campaignIdMap.get(scene.campaignId);
              if (!newCampaignId) continue;
              const newSceneId = crypto.randomUUID();
              campaignSceneIdMap.set(scene.id, newSceneId);
              scenesToAdd.push({
                ...scene,
                id: newSceneId,
                campaignId: newCampaignId,
                createdAt: now,
                updatedAt: now,
              });
            }
            if (scenesToAdd.length > 0) {
              await bulkAddInChunks(db.campaignScenes, scenesToAdd);
              importedCounts.campaignScenes = scenesToAdd.length;
            }
          }

          const campaignCharactersFile = getZipFile('application data/campaignCharacters.json');
          if (campaignCharactersFile) {
            const ccText = await campaignCharactersFile.async('text');
            const ccToImport: CampaignCharacter[] = JSON.parse(ccText);
            const ccToAdd: CampaignCharacter[] = [];
            for (const cc of ccToImport) {
              const newCampaignId = campaignIdMap.get(cc.campaignId);
              if (!newCampaignId) continue;
              const newSceneId = cc.campaignSceneId
                ? campaignSceneIdMap.get(cc.campaignSceneId)
                : undefined;
              ccToAdd.push({
                ...cc,
                id: crypto.randomUUID(),
                campaignId: newCampaignId,
                campaignSceneId: newSceneId ?? cc.campaignSceneId,
                createdAt: now,
                updatedAt: now,
              });
            }
            if (ccToAdd.length > 0) {
              await bulkAddInChunks(db.campaignCharacters, ccToAdd);
              importedCounts.campaignCharacters = ccToAdd.length;
            }
          }

          const campaignEventsFile = getZipFile('application data/campaignEvents.json');
          if (campaignEventsFile) {
            const ceText = await campaignEventsFile.async('text');
            const ceToImport: CampaignEvent[] = JSON.parse(ceText);
            const ceToAdd: CampaignEvent[] = [];
            for (const ev of ceToImport) {
              const newCampaignId = campaignIdMap.get(ev.campaignId);
              if (!newCampaignId) continue;
              const newSceneId = campaignSceneIdMap.get(ev.sceneId);
              if (!newSceneId) continue;
              ceToAdd.push({
                ...ev,
                id: crypto.randomUUID(),
                campaignId: newCampaignId,
                sceneId: newSceneId,
                createdAt: now,
                updatedAt: now,
              });
            }
            if (ceToAdd.length > 0) {
              await bulkAddInChunks(db.campaignEvents, ceToAdd);
              importedCounts.campaignEvents = ceToAdd.length;
            }
          }

          const sceneTurnCallbacksFile = getZipFile('application data/sceneTurnCallbacks.json');
          if (sceneTurnCallbacksFile) {
            const stcText = await sceneTurnCallbacksFile.async('text');
            const stcToImport: SceneTurnCallback[] = JSON.parse(stcText);
            const stcToAdd: SceneTurnCallback[] = [];
            for (const stc of stcToImport) {
              const newSceneId = campaignSceneIdMap.get(stc.campaignSceneId);
              if (!newSceneId) continue;
              stcToAdd.push({
                ...stc,
                id: crypto.randomUUID(),
                campaignSceneId: newSceneId,
                createdAt: now,
                updatedAt: now,
              });
            }
            if (stcToAdd.length > 0) {
              await bulkAddInChunks(db.sceneTurnCallbacks, stcToAdd);
              importedCounts.sceneTurnCallbacks = stcToAdd.length;
            }
          }
        } catch (error) {
          allErrors.push(
            `Failed to import campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import archetypes (after characters, since archetype.testCharacterId references character)
      const archetypesFile = getZipFile('application data/archetypes.json');
      if (archetypesFile) {
        try {
          const archetypesText = await archetypesFile.async('text');
          const archetypesToImport: Archetype[] = JSON.parse(archetypesText);

          const archetypesToAdd: Archetype[] = [];
          for (const archetype of archetypesToImport) {
            const newArchetype: Archetype = {
              ...archetype,
              rulesetId: newRulesetId,
              testCharacterId: archetype.testCharacterId,
              createdAt: now,
              updatedAt: now,
            };
            if (newArchetype.image && isUrl(newArchetype.image) && !newArchetype.assetId) {
              const id = await getOrCreateUrlAssetId(
                newArchetype.image,
                newRulesetId,
                urlToAssetIdMap,
              );
              if (id) {
                newArchetype.assetId = id;
                newArchetype.image = undefined;
              }
            }
            archetypesToAdd.push(newArchetype);
          }
          if (archetypesToAdd.length > 0) {
            await bulkAddInChunks(db.archetypes, archetypesToAdd);
            importedCounts.archetypes = archetypesToAdd.length;
          }
        } catch (error) {
          allErrors.push(
            `Failed to import archetypes: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import archetypeCustomProperties (after archetypes and customProperties; legacy exports may not have this file)
      const archetypeCustomPropertiesFile = getZipFile(
        'application data/archetypeCustomProperties.json',
      );
      if (archetypeCustomPropertiesFile) {
        try {
          const archetypeCustomPropertiesText = await archetypeCustomPropertiesFile.async('text');
          const archetypeCustomPropertiesToImport: ArchetypeCustomProperty[] = JSON.parse(
            archetypeCustomPropertiesText,
          );

          const validation = validateData(
            archetypeCustomPropertiesToImport,
            'archetypeCustomProperties',
          );
          if (validation.isValid) {
            const toAdd: ArchetypeCustomProperty[] = archetypeCustomPropertiesToImport.map(
              (acp) => ({
                ...acp,
                createdAt: now,
                updatedAt: now,
              }),
            );
            await bulkAddInChunks(db.archetypeCustomProperties, toAdd);
            importedCounts.archetypeCustomProperties = toAdd.length;
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import archetypeCustomProperties: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Legacy export (no archetypes.json): ruleset creation hook creates default archetype from first test character

      setImportStep('Creating ruleset');

      // Create ruleset after importing characters so test character isn't duplicated (skip when content-only import)
      if (!options?.contentOnlyIntoRulesetId) {
        await createRuleset(newRuleset);
      }

      setImportStep('Importing scripts');

      // Import scripts after all entities are created (so we can link scripts to entities)
      try {
        const scriptFiles = await extractScriptFiles(zipContent, pathPrefix);
        const scriptMetadata = metadata.scripts || [];

        if (scriptFiles.length > 0) {
          const scriptImportResult = await importScripts(newRulesetId, scriptFiles, scriptMetadata);

          importedCounts.scripts = scriptImportResult.importedCount;

          // Add script import warnings and errors to the overall result
          if (scriptImportResult.warnings.length > 0) {
            allErrors.push(...scriptImportResult.warnings.map((w) => `Script warning: ${w}`));
          }
          if (scriptImportResult.errors.length > 0) {
            allErrors.push(...scriptImportResult.errors.map((e) => `Script error: ${e}`));
          }

          // Link scripts to entities: batch updates by entity type to avoid N sequential round-trips
          const scriptsWithEntity = await db.scripts
            .where('rulesetId')
            .equals(newRulesetId)
            .filter((s) => s.entityId != null && s.entityType !== 'global')
            .toArray();

          type BulkUpdateEntry = { key: string; changes: { scriptId: string } };
          const attributeUpdates: BulkUpdateEntry[] = [];
          const actionUpdates: BulkUpdateEntry[] = [];
          const itemUpdates: BulkUpdateEntry[] = [];
          const archetypeUpdates: BulkUpdateEntry[] = [];

          for (const script of scriptsWithEntity) {
            if (!script.entityId) continue;
            const entry = { key: script.entityId, changes: { scriptId: script.id } };
            if (script.entityType === 'attribute') attributeUpdates.push(entry);
            else if (script.entityType === 'action') actionUpdates.push(entry);
            else if (script.entityType === 'item') itemUpdates.push(entry);
            else if (script.entityType === 'archetype') archetypeUpdates.push(entry);
          }

          await db.transaction(
            'rw',
            db.attributes,
            db.actions,
            db.items,
            db.archetypes,
            async () => {
              if (attributeUpdates.length) await db.attributes.bulkUpdate(attributeUpdates);
              if (actionUpdates.length) await db.actions.bulkUpdate(actionUpdates);
              if (itemUpdates.length) await db.items.bulkUpdate(itemUpdates);
              if (archetypeUpdates.length) await db.archetypes.bulkUpdate(archetypeUpdates);
            },
          );
        }
      } catch (error) {
        allErrors.push(
          `Failed to import scripts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Landing CTA asset ids + titles: merge from metadata with put() after all content (assets) exists.
      // Skipped when createRuleset is not run (content-only + existing row); still applied here.
      try {
        await persistRulesetLandingCtaFromMetadata(newRulesetId, metadata.ruleset);
      } catch (error) {
        allErrors.push(
          `Failed to apply ruleset landing CTA fields: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      setImportStep('Finalizing');
      await new Promise<void>((resolve) => setTimeout(resolve, 3000));

      const totalImported =
        importedCounts.attributes +
        importedCounts.actions +
        importedCounts.items +
        importedCounts.charts +
        importedCounts.characters +
        importedCounts.windows +
        importedCounts.components +
        importedCounts.composites +
        importedCounts.compositeVariants +
        importedCounts.assets +
        importedCounts.fonts +
        importedCounts.documents +
        importedCounts.archetypes +
        importedCounts.customProperties +
        importedCounts.archetypeCustomProperties +
        importedCounts.itemCustomProperties +
        importedCounts.characterAttributes +
        importedCounts.inventories +
        importedCounts.characterWindows +
        importedCounts.characterPages +
        importedCounts.rulesetPages +
        importedCounts.rulesetWindows +
        importedCounts.inventoryItems +
        importedCounts.scripts +
        importedCounts.campaigns +
        importedCounts.campaignScenes +
        importedCounts.campaignCharacters +
        importedCounts.campaignEvents +
        importedCounts.sceneTurnCallbacks;

      return {
        success: allErrors.length === 0,
        message: `Successfully imported ruleset "${newRuleset.title}" with ${totalImported} entities.`,
        importedRuleset: newRuleset,
        importedCounts,
        errors: allErrors,
      };
    } catch (error) {
      await handleError(error as Error, {
        component: 'useImportRuleset/importRuleset',
        severity: 'medium',
      });

      return {
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importedCounts: {
          attributes: 0,
          actions: 0,
          items: 0,
          charts: 0,
          characters: 0,
          windows: 0,
          components: 0,
          composites: 0,
          compositeVariants: 0,
          assets: 0,
          fonts: 0,
          documents: 0,
          archetypes: 0,
          customProperties: 0,
          archetypeCustomProperties: 0,
          itemCustomProperties: 0,
          characterAttributes: 0,
          inventories: 0,
          characterWindows: 0,
          characterPages: 0,
          rulesetWindows: 0,
          inventoryItems: 0,
          scripts: 0,
          campaigns: 0,
          campaignScenes: 0,
          campaignCharacters: 0,
          campaignEvents: 0,
          sceneTurnCallbacks: 0,
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      setIsImporting(false);
      setImportStep(null);
    }
  };

  return {
    importRuleset,
    isImporting,
    importStep,
  };
};
