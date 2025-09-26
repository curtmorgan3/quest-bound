import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Action, Attribute, Chart, Item, Ruleset } from '@/types';
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
    type: 'attributes' | 'actions' | 'items' | 'charts',
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push(`${type} data must be an array`);
      return { isValid: false, errors };
    }

    data.forEach((item, index) => {
      // Check required fields
      if (!item.title || typeof item.title !== 'string') {
        errors.push(`${type} ${index + 1}: title is required and must be a string`);
      }
      // if (!item.description || typeof item.description !== 'string') {
      //   errors.push(`${type} ${index + 1}: description is required and must be a string`);
      // }

      // Type-specific validation
      switch (type) {
        case 'attributes':
          if (!item.type || !['string', 'number', 'boolean', 'enum'].includes(item.type)) {
            errors.push(
              `Attribute ${index + 1}: type must be one of: string, number, boolean, enum`,
            );
          }
          if (item.defaultValue === undefined || item.defaultValue === null) {
            errors.push(`Attribute ${index + 1}: defaultValue is required`);
          }
          if (item.type === 'enum' && (!item.options || !Array.isArray(item.options))) {
            errors.push(`Attribute ${index + 1}: options array is required for enum type`);
          }
          break;

        case 'items':
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
          break;

        case 'charts':
          if (!item.data || typeof item.data !== 'string') {
            errors.push(`Chart ${index + 1}: data is required and must be a string`);
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
          importedCounts: { attributes: 0, actions: 0, items: 0, charts: 0 },
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
          importedCounts: { attributes: 0, actions: 0, items: 0, charts: 0 },
          errors: metadataValidation.errors,
        };
      }

      // Create new ruleset
      const now = new Date().toISOString();
      const newRulesetId = crypto.randomUUID();

      const newRuleset: Ruleset = {
        id: newRulesetId,
        title: metadata.ruleset.title,
        description: metadata.ruleset.description,
        version: metadata.ruleset.version,
        createdBy: metadata.ruleset.createdBy,
        details: metadata.ruleset.details || {},
        image: metadata.ruleset.image,
        createdAt: now,
        updatedAt: now,
      };

      // await db.rulesets.add(newRuleset);
      await createRuleset(newRuleset);

      // Import content files
      const importedCounts = {
        attributes: 0,
        actions: 0,
        items: 0,
        charts: 0,
      };

      const allErrors: string[] = [];

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
                id: crypto.randomUUID(),
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
                id: crypto.randomUUID(),
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
                id: crypto.randomUUID(),
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
                id: crypto.randomUUID(),
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

      const totalImported =
        importedCounts.attributes +
        importedCounts.actions +
        importedCounts.items +
        importedCounts.charts;

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
        importedCounts: { attributes: 0, actions: 0, items: 0, charts: 0 },
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
