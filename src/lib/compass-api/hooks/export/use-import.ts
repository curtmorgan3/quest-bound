import { useRulesets } from '@/lib/compass-api';
import { db } from '@/stores';
import type { Action, Attribute, Item } from '@/types';
import { useState } from 'react';

export interface ImportResult {
  success: boolean;
  message: string;
  importedCount: number;
  errors: string[];
}

export const useImport = (type: 'attributes' | 'items' | 'actions') => {
  const { activeRuleset } = useRulesets();
  const [isLoading, setIsLoading] = useState(false);

  const validateData = (data: any[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { isValid: false, errors };
    }

    data.forEach((item, index) => {
      // Check required fields
      if (!item.title || typeof item.title !== 'string') {
        errors.push(`Item ${index + 1}: title is required and must be a string`);
      }
      if (typeof item?.description !== 'string') {
        errors.push(`Item ${index + 1}: description is required and must be a string`);
      }

      // Type-specific validation
      switch (type) {
        case 'attributes':
          if (!item.type || !['string', 'number', 'boolean', 'enum'].includes(item.type)) {
            errors.push(`Item ${index + 1}: type must be one of: string, number, boolean, enum`);
          }
          if (item.defaultValue === undefined || item.defaultValue === null) {
            errors.push(`Item ${index + 1}: defaultValue is required`);
          }
          if (item.type === 'enum' && (!item.options || !Array.isArray(item.options))) {
            errors.push(`Item ${index + 1}: options array is required for enum type`);
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
          if (typeof item.inventoryWidth !== 'number') {
            errors.push(`Item ${index + 1}: inventoryWidth must be a number`);
          }
          if (typeof item.inventoryHeight !== 'number') {
            errors.push(`Item ${index + 1}: inventoryHeight must be a number`);
          }
          break;

        case 'actions':
          // Actions only require title and description, which are already validated above
          break;
      }
    });

    return { isValid: errors.length === 0, errors };
  };

  const importData = async (file: File): Promise<ImportResult> => {
    if (!activeRuleset) {
      return {
        success: false,
        message: 'No active ruleset selected',
        importedCount: 0,
        errors: ['No active ruleset selected'],
      };
    }

    setIsLoading(true);

    try {
      // Read and parse the file
      const text = await file.text();
      const parsedData = JSON.parse(text);

      // Validate the structure
      if (!parsedData.data || !Array.isArray(parsedData.data)) {
        return {
          success: false,
          message: 'Invalid file format: expected data array',
          importedCount: 0,
          errors: ['File must contain a "data" array'],
        };
      }

      // Validate each item
      const validation = validateData(parsedData.data);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Validation failed: ${validation.errors.length} errors found`,
          importedCount: 0,
          errors: validation.errors,
        };
      }

      // Import the data
      const now = new Date().toISOString();
      let importedCount = 0;

      for (const item of parsedData.data) {
        const newRecord = {
          ...item,
          defaultValue:
            item.type === 'number'
              ? Number(item.defaultValue)
              : item.defaultValue === 'boolean'
                ? item.defaultValue === 'true'
                : item.defaultValue,
          rulesetId: activeRuleset.id,
          createdAt: now,
          updatedAt: now,
        };

        try {
          switch (type) {
            case 'attributes':
              await db.attributes.add(newRecord as Attribute);
              break;
            case 'items':
              await db.items.add(newRecord as Item);
              break;
            case 'actions':
              await db.actions.add(newRecord as Action);
              break;
          }
          importedCount++;
        } catch (e) {
          console.error('Failed to import item:', item, e);
        }
      }

      return {
        success: true,
        message: `Successfully imported ${importedCount} ${type}`,
        importedCount,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    importData,
    isLoading,
  };
};
