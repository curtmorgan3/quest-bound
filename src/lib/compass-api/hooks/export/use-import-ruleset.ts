import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type {
  Action,
  Asset,
  Attribute,
  Character,
  CharacterAttribute,
  CharacterWindow,
  Chart,
  Component,
  Document,
  Font,
  Inventory,
  Item,
  Ruleset,
  Window,
} from '@/types';
import JSZip from 'jszip';
import { useState } from 'react';
import { useRulesets } from '../rulesets';

export interface ImportRulesetResult {
  success: boolean;
  message: string;
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
    characterAttributes: number;
    inventories: number;
    characterWindows: number;
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
  };
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
      | 'characterWindows',
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
          if (!item.inventoryId || typeof item.inventoryId !== 'string') {
            errors.push(`Inventory ${index + 1}: inventoryId is required and must be a string`);
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
      }
    });

    return { isValid: errors.length === 0, errors };
  };

  const importRuleset = async (file: File): Promise<ImportRulesetResult> => {
    setIsImporting(true);

    try {
      // Parse the zip file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      // Extract metadata
      const metadataFile = zipContent.file('metadata.json');
      if (!metadataFile) {
        return {
          success: false,
          message: 'Invalid zip file: metadata.json not found',
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
            characterAttributes: 0,
            inventories: 0,
            characterWindows: 0,
          },
          errors: ['metadata.json file is required'],
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
            characterAttributes: 0,
            inventories: 0,
            characterWindows: 0,
          },
          errors: metadataValidation.errors,
        };
      }

      const now = new Date().toISOString();
      const newRulesetId = metadata.ruleset.id;

      const newRuleset: Ruleset = {
        id: newRulesetId,
        title: metadata.ruleset.title,
        description: metadata.ruleset.description,
        version: metadata.ruleset.version,
        createdBy: metadata.ruleset.createdBy,
        details: metadata.ruleset.details || {},
        image: metadata.ruleset.image,
        assetId: null,
        createdAt: now,
        updatedAt: now,
      };

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
        characterAttributes: 0,
        inventories: 0,
        characterWindows: 0,
      };

      const allErrors: string[] = [];

      // Import characters
      const charactersFile = zipContent.file('characters.json');
      if (charactersFile) {
        try {
          const charactersText = await charactersFile.async('text');
          const characters: Character[] = JSON.parse(charactersText);

          const validation = validateData(characters, 'characters');
          if (validation.isValid) {
            for (const character of characters) {
              const newCharacter: Character = {
                ...character,
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

      // Create ruleset after importing characters so test character isn't duplicated
      await createRuleset(newRuleset);

      // Import characterAttributes
      const characterAttributesFile = zipContent.file('characterAttributes.json');
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
              console.log('attr: ', newCharacterAttribute);
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

      // Import attributes
      const attributesFile = zipContent.file('attributes.json');
      if (attributesFile) {
        try {
          const attributesText = await attributesFile.async('text');
          const attributes: Attribute[] = JSON.parse(attributesText);

          const validation = validateData(attributes, 'attributes');
          if (validation.isValid) {
            for (const attribute of attributes) {
              const newAttribute: Attribute = {
                ...attribute,
                rulesetId: newRulesetId,
                createdAt: now,
                updatedAt: now,
              };
              await db.attributes.add(newAttribute);
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

      // Import actions
      const actionsFile = zipContent.file('actions.json');
      if (actionsFile) {
        try {
          const actionsText = await actionsFile.async('text');
          const actions: Action[] = JSON.parse(actionsText);

          const validation = validateData(actions, 'actions');
          if (validation.isValid) {
            for (const action of actions) {
              const newAction: Action = {
                ...action,
                rulesetId: newRulesetId,
                createdAt: now,
                updatedAt: now,
              };
              await db.actions.add(newAction);
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

      // Import items
      const itemsFile = zipContent.file('items.json');
      if (itemsFile) {
        try {
          const itemsText = await itemsFile.async('text');
          const items: Item[] = JSON.parse(itemsText);

          const validation = validateData(items, 'items');
          if (validation.isValid) {
            for (const item of items) {
              const newItem: Item = {
                ...item,
                rulesetId: newRulesetId,
                createdAt: now,
                updatedAt: now,
              };
              await db.items.add(newItem);
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

      // Import charts
      const chartsFile = zipContent.file('charts.json');
      if (chartsFile) {
        try {
          const chartsText = await chartsFile.async('text');
          const charts: Chart[] = JSON.parse(chartsText);

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
      const windowsFile = zipContent.file('windows.json');
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
      const componentsFile = zipContent.file('components.json');
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

      // Import assets
      const assetsFile = zipContent.file('assets.json');
      if (assetsFile) {
        try {
          const assetsText = await assetsFile.async('text');
          const assets: Asset[] = JSON.parse(assetsText);

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

      // Import fonts
      const fontsFile = zipContent.file('fonts.json');
      if (fontsFile) {
        try {
          const fontsText = await fontsFile.async('text');
          const fonts: Font[] = JSON.parse(fontsText);

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
      const documentsFile = zipContent.file('documents.json');
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
              const pdfFileEntries = Object.entries(zipContent.files).filter(
                ([path]) => path.startsWith('documents/') && path.endsWith('.pdf'),
              );

              for (const [path, file] of pdfFileEntries) {
                // Extract document ID from filename (format: {title}_{id}.pdf)
                const filename = path.replace('documents/', '');
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
      const inventories = zipContent.file('inventories.json');
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
      const characterWindowsFile = zipContent.file('characterWindows.json');
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
        importedCounts.characterAttributes +
        importedCounts.inventories +
        importedCounts.characterWindows;

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
          characterAttributes: 0,
          inventories: 0,
          characterWindows: 0,
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
