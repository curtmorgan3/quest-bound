import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type {
  Action,
  Archetype,
  Asset,
  Attribute,
  Character,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Chart,
  Component,
  Document,
  Font,
  Inventory,
  InventoryItem,
  Item,
  Page,
  Ruleset,
  RulesetPage,
  RulesetWindow,
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
    assets: number;
    fonts: number;
    documents: number;
    archetypes: number;
    characterAttributes: number;
    inventories: number;
    characterWindows: number;
    characterPages: number;
    rulesetPages: number;
    rulesetWindows: number;
    inventoryItems: number;
    scripts: number;
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
    image: string | null;
    isModule: boolean;
    palette?: string[];
  };
  exportInfo: {
    exportedAt: string;
    exportedBy: string;
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
    assets: number;
    fonts: number;
    documents: number;
    characterAttributes: number;
    characterInventories: number;
    characterWindows: number;
    characterPages?: number;
    rulesetPages?: number;
    rulesetWindows?: number;
    inventoryItems?: number;
    scripts?: number;
  };
  scripts?: ScriptMetadata[];
}

export const useImportRuleset = () => {
  const [isImporting, setIsImporting] = useState(false);
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
      | 'inventoryItems',
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

        case 'assets':
          if (!item.data || typeof item.data !== 'string') {
            errors.push(`Asset ${index + 1}: data is required and must be a string`);
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
          if (!item.pageId || typeof item.pageId !== 'string') {
            errors.push(`CharacterPage ${index + 1}: pageId is required and must be a string`);
          }
          break;

        case 'rulesetPages':
          if (!item.rulesetId || typeof item.rulesetId !== 'string') {
            errors.push(`RulesetPage ${index + 1}: rulesetId is required and must be a string`);
          }
          if (!item.pageId || typeof item.pageId !== 'string') {
            errors.push(`RulesetPage ${index + 1}: pageId is required and must be a string`);
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
            assets: 0,
            fonts: 0,
            documents: 0,
            archetypes: 0,
            characterAttributes: 0,
            inventories: 0,
            characterWindows: 0,
            characterPages: 0,
            rulesetPages: 0,
            rulesetWindows: 0,
            inventoryItems: 0,
            scripts: 0,
          },
          errors: [
            'application data/metadata.json file is required. When manually zipping, compress the contents of the export folder so that "application data" appears at the root of the zip.',
          ],
        };
      }

      const metadataText = await metadataFile.async('text');
      const metadata: ImportedMetadata = JSON.parse(metadataText);

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
            assets: 0,
            fonts: 0,
            documents: 0,
            archetypes: 0,
            characterAttributes: 0,
            inventories: 0,
            characterWindows: 0,
            characterPages: 0,
            rulesetPages: 0,
            rulesetWindows: 0,
            inventoryItems: 0,
            scripts: 0,
          },
          errors: metadataValidation.errors,
        };
      }

      const now = new Date().toISOString();
      let newRulesetId = metadata.ruleset.id;

      const newRuleset: Ruleset = {
        id: newRulesetId,
        title: metadata.ruleset.title,
        description: metadata.ruleset.description,
        version: metadata.ruleset.version,
        createdBy: metadata.ruleset.createdBy,
        details: metadata.ruleset.details || {},
        image: metadata.ruleset.image,
        isModule: metadata.ruleset.isModule || false,
        assetId: null,
        createdAt: now,
        updatedAt: now,
        palette: Array.isArray(metadata.ruleset.palette) ? metadata.ruleset.palette : [],
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
                image: newRuleset.image,
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
                assets: 0,
                fonts: 0,
                  documents: 0,
                  archetypes: 0,
                  characterAttributes: 0,
                  inventories: 0,
                  characterWindows: 0,
                  characterPages: 0,
                  rulesetPages: 0,
                  rulesetWindows: 0,
                  inventoryItems: 0,
                  scripts: 0,
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
                  assets: 0,
                  fonts: 0,
                  documents: 0,
                  archetypes: 0,
                  characterAttributes: 0,
                  inventories: 0,
                  characterWindows: 0,
                  characterPages: 0,
                  rulesetPages: 0,
                  rulesetWindows: 0,
                  inventoryItems: 0,
                  scripts: 0,
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
              importedCounts: {
                attributes: 0,
                actions: 0,
                items: 0,
                charts: 0,
                characters: 0,
                windows: 0,
                components: 0,
                assets: 0,
                fonts: 0,
                documents: 0,
                archetypes: 0,
                characterAttributes: 0,
                inventories: 0,
                characterWindows: 0,
                characterPages: 0,
                rulesetPages: 0,
                rulesetWindows: 0,
                inventoryItems: 0,
                scripts: 0,
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
        assets: 0,
        fonts: 0,
        documents: 0,
        archetypes: 0,
        characterAttributes: 0,
        inventories: 0,
        characterWindows: 0,
        characterPages: 0,
        rulesetPages: 0,
        rulesetWindows: 0,
        inventoryItems: 0,
        scripts: 0,
      };

      const allErrors: string[] = [];

      // Build filename -> assetId map for resolving asset references in actions/items
      // Read asset metadata early (before importing) to build the map
      const assetFilenameToIdMap: Record<string, string> = {};
      const assetsMetadataFile = getZipFile('application data/assets.json');
      if (assetsMetadataFile) {
        try {
          const assetsMetadataText = await assetsMetadataFile.async('text');
          const assetsMetadataForMap: Array<{ id: string; filename: string; directory?: string }> =
            JSON.parse(assetsMetadataText);

          for (const assetMeta of assetsMetadataForMap) {
            // Build the full path (directory + filename) as the key
            let fullPath = assetMeta.filename;
            if (assetMeta.directory) {
              const directoryPath = assetMeta.directory.replace(/^\/+|\/+$/g, '');
              if (directoryPath) {
                fullPath = `${directoryPath}/${assetMeta.filename}`;
              }
            }
            assetFilenameToIdMap[fullPath] = assetMeta.id;
          }
        } catch {
          // If we can't read asset metadata, continue without the map
          // Asset references in actions/items will just be undefined
        }
      }

      // Import characterAttributes
      const characterAttributesFile = getZipFile('application data/characterAttributes.json');
      if (characterAttributesFile) {
        try {
          const characterAttributesText = await characterAttributesFile.async('text');
          const characterAttributes: CharacterAttribute[] = JSON.parse(characterAttributesText);

          const validation = validateData(characterAttributes, 'characterAttributes');
          if (validation.isValid) {
            for (const characterAttribute of characterAttributes) {
              const newCharacterAttribute: CharacterAttribute = {
                ...characterAttribute,
                createdAt: now,
                updatedAt: now,
              };
              await db.characterAttributes.add(newCharacterAttribute);
              importedCounts.characterAttributes++;
            }
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

          // Convert to proper Attribute objects
          const attributes: Attribute[] = parsedAttributes.map((item) => ({
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
            image: (item.image as string)?.trim() || null,
            rulesetId: newRulesetId,
            createdAt: now,
            updatedAt: now,
          }));

          const validation = validateData(attributes, 'attributes');
          if (validation.isValid) {
            for (const attribute of attributes) {
              await db.attributes.add(attribute);
              importedCounts.attributes++;
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import attributes: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

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
              rulesetId: newRulesetId,
              createdAt: now,
              updatedAt: now,
            };
          });

          const validation = validateData(actions, 'actions');
          if (validation.isValid) {
            for (const action of actions) {
              await db.actions.add(action);
              importedCounts.actions++;
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import actions: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

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
            for (const item of items) {
              await db.items.add(item);
              importedCounts.items++;
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import items: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

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
            for (const chart of charts) {
              const newChart: Chart = {
                ...chart,
                rulesetId: newRulesetId,
                createdAt: now,
                updatedAt: now,
              };
              await db.charts.add(newChart);
              importedCounts.charts++;
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import charts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import windows (must be imported before components since components reference windows)
      const windowsFile = getZipFile('application data/windows.json');
      if (windowsFile) {
        try {
          const windowsText = await windowsFile.async('text');
          const windows: Window[] = JSON.parse(windowsText);

          const validation = validateData(windows, 'windows');
          if (validation.isValid) {
            for (const window of windows) {
              const newWindow: Window = {
                ...window,
                rulesetId: newRulesetId,
                createdAt: now,
                updatedAt: now,
              };
              await db.windows.add(newWindow);
              importedCounts.windows++;
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import windows: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import components (must be imported after windows to map windowIds)
      const componentsFile = getZipFile('application data/components.json');
      if (componentsFile) {
        try {
          const componentsText = await componentsFile.async('text');
          const components: Component[] = JSON.parse(componentsText);

          const validation = validateData(components, 'components');
          if (validation.isValid) {
            for (const component of components) {
              const newComponent: Component = {
                ...component,
                createdAt: now,
                updatedAt: now,
              };
              await db.components.add(newComponent);
              importedCounts.components++;
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import components: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import assets (metadata from JSON, data from files in assets folder)
      const assetsFile = getZipFile('application data/assets.json');
      if (assetsFile) {
        try {
          const assetsText = await assetsFile.async('text');
          const assetsMetadata: Omit<Asset, 'data'>[] = JSON.parse(assetsText);

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

          // Reconstruct assets with their data
          const assets: Asset[] = assetsMetadata.map((metadata) => {
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
            for (const asset of assets) {
              const newAsset: Asset = {
                ...asset,
                rulesetId: newRulesetId,
                createdAt: now,
                updatedAt: now,
              };
              await db.assets.add(newAsset);
              importedCounts.assets++;
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import assets: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

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
            for (const font of fonts) {
              const newFont: Font = {
                ...font,
                rulesetId: newRulesetId,
                createdAt: now,
                updatedAt: now,
              };
              await db.fonts.add(newFont);
              importedCounts.fonts++;
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import fonts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

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

            for (const document of documents) {
              const newDocument: Document = {
                ...document,
                rulesetId: newRulesetId,
                // Restore pdfData from the PDF file if available
                pdfData: pdfFiles[document.id] || null,
                createdAt: now,
                updatedAt: now,
              };
              await db.documents.add(newDocument);
              importedCounts.documents++;
            }
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
            for (const characterInventory of characterInventories) {
              const newCharacterInventory: Inventory = {
                ...characterInventory,
                createdAt: now,
                updatedAt: now,
              };
              await db.inventories.add(newCharacterInventory);
              importedCounts.inventories++;
            }
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
            for (const characterWindow of characterWindows) {
              const newCharacterWindow: CharacterWindow = {
                ...characterWindow,
                createdAt: now,
                updatedAt: now,
              };
              await db.characterWindows.add(newCharacterWindow);
              importedCounts.characterWindows++;
            }
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
            for (const page of pagesToImport) {
              const newPage: Page = {
                ...page,
                createdAt: now,
                updatedAt: now,
              };
              await db.pages.add(newPage);
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import pages: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import rulesetPages (joins; require pages to be imported first). Build oldId->newId map for rulesetWindows.
      const rulesetPageIdMap = new Map<string, string>();
      const rulesetPagesFile = getZipFile('application data/rulesetPages.json');
      if (rulesetPagesFile) {
        try {
          const rulesetPagesText = await rulesetPagesFile.async('text');
          const rulesetPagesToImport: RulesetPage[] = JSON.parse(rulesetPagesText);

          const validation = validateData(rulesetPagesToImport, 'rulesetPages');
          if (validation.isValid) {
            for (const rulesetPage of rulesetPagesToImport) {
              const newId = crypto.randomUUID();
              rulesetPageIdMap.set(rulesetPage.id, newId);
              const newRulesetPage: RulesetPage = {
                ...rulesetPage,
                id: newId,
                rulesetId: newRulesetId,
                pageId: rulesetPage.pageId,
                createdAt: now,
                updatedAt: now,
              };
              await db.rulesetPages.add(newRulesetPage);
              importedCounts.rulesetPages++;
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import rulesetPages: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import rulesetWindows (require rulesetPages and windows to be imported first)
      const rulesetWindowsFile = getZipFile('application data/rulesetWindows.json');
      if (rulesetWindowsFile) {
        try {
          const rulesetWindowsText = await rulesetWindowsFile.async('text');
          const rulesetWindowsToImport: RulesetWindow[] = JSON.parse(rulesetWindowsText);

          const validation = validateData(rulesetWindowsToImport, 'rulesetWindows');
          if (validation.isValid) {
            for (const rw of rulesetWindowsToImport) {
              const newRulesetWindow: RulesetWindow = {
                ...rw,
                id: crypto.randomUUID(),
                rulesetId: newRulesetId,
                rulesetPageId: rw.rulesetPageId
                  ? (rulesetPageIdMap.get(rw.rulesetPageId) ?? null)
                  : null,
                windowId: rw.windowId,
                createdAt: now,
                updatedAt: now,
              };
              await db.rulesetWindows.add(newRulesetWindow);
              importedCounts.rulesetWindows++;
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import rulesetWindows: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import characterPages (joins; require pages to be imported first)
      const characterPagesFile = getZipFile('application data/characterPages.json');
      if (characterPagesFile) {
        try {
          const characterPagesText = await characterPagesFile.async('text');
          const characterPages: CharacterPage[] = JSON.parse(characterPagesText);

          const validation = validateData(characterPages, 'characterPages');
          if (validation.isValid) {
            for (const characterPage of characterPages) {
              const newCharacterPage: CharacterPage = {
                ...characterPage,
                createdAt: now,
                updatedAt: now,
              };
              await db.characterPages.add(newCharacterPage);
              importedCounts.characterPages++;
            }
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
            for (const inventoryItem of inventoryItems) {
              const newInventoryItem: InventoryItem = {
                ...inventoryItem,
                createdAt: now,
                updatedAt: now,
              };
              await db.inventoryItems.add(newInventoryItem);
              importedCounts.inventoryItems++;
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import inventoryItems: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import characters
      const charactersFile = getZipFile('application data/characters.json');
      if (charactersFile) {
        try {
          const charactersText = await charactersFile.async('text');
          const characters: Character[] = JSON.parse(charactersText);

          const validation = validateData(characters, 'characters');
          if (validation.isValid) {
            for (const character of characters) {
              const newCharacter: Character = {
                ...character,
                rulesetId: newRulesetId,
                createdAt: now,
                updatedAt: now,
              };
              await db.characters.add(newCharacter);
              importedCounts.characters++;
            }
          } else {
            allErrors.push(...validation.errors);
          }
        } catch (error) {
          allErrors.push(
            `Failed to import characters: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Import archetypes (after characters, since archetype.testCharacterId references character)
      const archetypesFile = getZipFile('application data/archetypes.json');
      if (archetypesFile) {
        try {
          const archetypesText = await archetypesFile.async('text');
          const archetypesToImport: Archetype[] = JSON.parse(archetypesText);

          for (const archetype of archetypesToImport) {
            const newArchetype: Archetype = {
              ...archetype,
              rulesetId: newRulesetId,
              testCharacterId: archetype.testCharacterId,
              createdAt: now,
              updatedAt: now,
            };
            await db.archetypes.add(newArchetype);
            importedCounts.archetypes++;
          }
        } catch (error) {
          allErrors.push(
            `Failed to import archetypes: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
      // Legacy export (no archetypes.json): ruleset creation hook creates default archetype from first test character

      // Create ruleset after importing characters so test character isn't duplicated (skip when content-only import)
      if (!options?.contentOnlyIntoRulesetId) {
        await createRuleset(newRuleset);
      }

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

          // Link scripts to entities: for each script with entityId, set that entity's scriptId
          const scriptsWithEntity = await db.scripts
            .where('rulesetId')
            .equals(newRulesetId)
            .filter((s) => s.entityId != null && s.entityType !== 'global')
            .toArray();
          for (const script of scriptsWithEntity) {
            if (!script.entityId) continue;
            if (script.entityType === 'attribute') {
              const attr = await db.attributes.get(script.entityId);
              if (attr?.rulesetId === newRulesetId) {
                await db.attributes.update(script.entityId, { scriptId: script.id });
              }
            } else if (script.entityType === 'action') {
              const action = await db.actions.get(script.entityId);
              if (action?.rulesetId === newRulesetId) {
                await db.actions.update(script.entityId, { scriptId: script.id });
              }
            } else if (script.entityType === 'item') {
              const item = await db.items.get(script.entityId);
              if (item?.rulesetId === newRulesetId) {
                await db.items.update(script.entityId, { scriptId: script.id });
              }
            } else if (script.entityType === 'archetype') {
              const archetype = await db.archetypes.get(script.entityId);
              if (archetype?.rulesetId === newRulesetId) {
                await db.archetypes.update(script.entityId, { scriptId: script.id });
              }
            }
          }
        }
      } catch (error) {
        allErrors.push(
          `Failed to import scripts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      const totalImported =
        importedCounts.attributes +
        importedCounts.actions +
        importedCounts.items +
        importedCounts.charts +
        importedCounts.characters +
        importedCounts.windows +
        importedCounts.components +
        importedCounts.assets +
        importedCounts.fonts +
        importedCounts.documents +
        importedCounts.archetypes +
        importedCounts.characterAttributes +
        importedCounts.inventories +
        importedCounts.characterWindows +
        importedCounts.characterPages +
        importedCounts.rulesetPages +
        importedCounts.rulesetWindows +
        importedCounts.inventoryItems +
        importedCounts.scripts;

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
          assets: 0,
          fonts: 0,
          documents: 0,
          archetypes: 0,
          characterAttributes: 0,
          inventories: 0,
          characterWindows: 0,
          characterPages: 0,
          rulesetPages: 0,
          rulesetWindows: 0,
          inventoryItems: 0,
          scripts: 0,
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      setIsImporting(false);
    }
  };

  return {
    importRuleset,
    isImporting,
  };
};
