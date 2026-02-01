import { useActiveRuleset } from '@/lib/compass-api';
import { db } from '@/stores';
import type { Action, Attribute, Item } from '@/types';
import { useState } from 'react';

export interface ImportResult {
  success: boolean;
  message: string;
  importedCount: number;
  updatedCount: number;
  errors: string[];
}

// Field type definitions for parsing TSV values
type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'attributeType';

const ATTRIBUTE_FIELD_TYPES: Record<string, FieldType> = {
  id: 'string',
  title: 'string',
  description: 'string',
  category: 'string',
  type: 'attributeType',
  options: 'array',
  defaultValue: 'string', // Will be converted based on attribute type
  optionsChartRef: 'number',
  optionsChartColumnHeader: 'string',
  min: 'number',
  max: 'number',
};

const ITEM_FIELD_TYPES: Record<string, FieldType> = {
  id: 'string',
  title: 'string',
  description: 'string',
  category: 'string',
  weight: 'number',
  defaultQuantity: 'number',
  stackSize: 'number',
  isContainer: 'boolean',
  isStorable: 'boolean',
  isEquippable: 'boolean',
  isConsumable: 'boolean',
  inventoryWidth: 'number',
  inventoryHeight: 'number',
};

const ACTION_FIELD_TYPES: Record<string, FieldType> = {
  id: 'string',
  title: 'string',
  description: 'string',
  category: 'string',
};

/**
 * Parses a TSV string into an array of rows (each row is an array of cell values)
 */
function parseTsv(tsvString: string): string[][] {
  const lines = tsvString.split('\n');
  return lines
    .map((line) => line.replace(/\r/g, '').split('\t'))
    .filter((row) => row.some((cell) => cell.trim() !== '')); // Filter out empty rows
}

/**
 * Converts a TSV value back to its proper type
 */
function parseTsvValue(value: string, fieldType: FieldType): unknown {
  // Handle empty values
  if (value === '' || value === undefined) {
    switch (fieldType) {
      case 'array':
        return [];
      case 'number':
        return undefined;
      case 'boolean':
        return false;
      default:
        return undefined;
    }
  }

  switch (fieldType) {
    case 'number':
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    case 'boolean':
      return value.toLowerCase() === 'true';
    case 'array':
      return value.split('|').filter((v) => v !== '');
    case 'attributeType':
      if (['string', 'number', 'boolean', 'list'].includes(value)) {
        return value;
      }
      return 'string';
    case 'string':
    default:
      // Unescape newlines
      return value.replace(/\\n/g, '\n');
  }
}

/**
 * Converts TSV rows into typed objects
 */
function tsvToObjects(
  rows: string[][],
  fieldTypes: Record<string, FieldType>
): Record<string, unknown>[] {
  if (rows.length < 2) return []; // Need at least header + 1 data row

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      const value = row[index] ?? '';
      const fieldType = fieldTypes[header] ?? 'string';
      obj[header] = parseTsvValue(value, fieldType);
    });
    return obj;
  });
}

/**
 * Converts the defaultValue based on the attribute type
 */
function convertAttributeDefaultValue(
  item: Record<string, unknown>
): string | number | boolean {
  const attrType = item.type as string;
  const defaultValue = item.defaultValue;

  if (defaultValue === undefined || defaultValue === null || defaultValue === '') {
    switch (attrType) {
      case 'number':
        return 0;
      case 'boolean':
        return false;
      default:
        return '';
    }
  }

  switch (attrType) {
    case 'number':
      return Number(defaultValue);
    case 'boolean':
      return String(defaultValue).toLowerCase() === 'true';
    default:
      return String(defaultValue);
  }
}

export const useImport = (type: 'attributes' | 'items' | 'actions') => {
  const { activeRuleset } = useActiveRuleset();
  const [isLoading, setIsLoading] = useState(false);

  const getFieldTypes = (): Record<string, FieldType> => {
    switch (type) {
      case 'attributes':
        return ATTRIBUTE_FIELD_TYPES;
      case 'items':
        return ITEM_FIELD_TYPES;
      case 'actions':
        return ACTION_FIELD_TYPES;
    }
  };

  const validateData = (data: Record<string, unknown>[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { isValid: false, errors };
    }

    data.forEach((item, index) => {
      // Check required fields
      if (!item.title || typeof item.title !== 'string') {
        errors.push(`Row ${index + 1}: title is required and must be a string`);
      }
      if (item.description !== undefined && typeof item.description !== 'string') {
        errors.push(`Row ${index + 1}: description must be a string`);
      }

      // Type-specific validation
      switch (type) {
        case 'attributes':
          if (!item.type || !['string', 'number', 'boolean', 'list'].includes(item.type as string)) {
            errors.push(`Row ${index + 1}: type must be one of: string, number, boolean, list`);
          }
          if (item.type === 'list' && (!item.options || !Array.isArray(item.options) || (item.options as unknown[]).length === 0)) {
            errors.push(`Row ${index + 1}: options array is required for list type`);
          }
          break;

        case 'items':
          if (item.weight !== undefined && typeof item.weight !== 'number') {
            errors.push(`Row ${index + 1}: weight must be a number`);
          }
          if (item.defaultQuantity !== undefined && typeof item.defaultQuantity !== 'number') {
            errors.push(`Row ${index + 1}: defaultQuantity must be a number`);
          }
          if (item.stackSize !== undefined && typeof item.stackSize !== 'number') {
            errors.push(`Row ${index + 1}: stackSize must be a number`);
          }
          if (item.inventoryWidth !== undefined && typeof item.inventoryWidth !== 'number') {
            errors.push(`Row ${index + 1}: inventoryWidth must be a number`);
          }
          if (item.inventoryHeight !== undefined && typeof item.inventoryHeight !== 'number') {
            errors.push(`Row ${index + 1}: inventoryHeight must be a number`);
          }
          break;

        case 'actions':
          // Actions only require title, which is already validated above
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
        updatedCount: 0,
        errors: ['No active ruleset selected'],
      };
    }

    setIsLoading(true);

    try {
      // Read and parse the TSV file
      const text = await file.text();
      const rows = parseTsv(text);

      if (rows.length < 2) {
        return {
          success: false,
          message: 'Invalid file format: expected header row and at least one data row',
          importedCount: 0,
          updatedCount: 0,
          errors: ['TSV file must contain a header row and at least one data row'],
        };
      }

      // Convert TSV to objects with proper types
      const fieldTypes = getFieldTypes();
      const parsedData = tsvToObjects(rows, fieldTypes);

      // Validate each item
      const validation = validateData(parsedData);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Validation failed: ${validation.errors.length} errors found`,
          importedCount: 0,
          updatedCount: 0,
          errors: validation.errors,
        };
      }

      // Import the data (additive with upsert)
      const now = new Date().toISOString();
      let importedCount = 0;
      let updatedCount = 0;

      for (const item of parsedData) {
        const id = item.id as string | undefined;

        try {
          // Check if record with this ID already exists
          let existingRecord = null;
          if (id) {
            switch (type) {
              case 'attributes':
                existingRecord = await db.attributes.get(id);
                break;
              case 'items':
                existingRecord = await db.items.get(id);
                break;
              case 'actions':
                existingRecord = await db.actions.get(id);
                break;
            }
          }

          if (existingRecord) {
            // Update existing record
            const updateData: Record<string, unknown> = {
              ...item,
              rulesetId: activeRuleset.id,
              updatedAt: now,
            };

            // Convert defaultValue for attributes
            if (type === 'attributes') {
              updateData.defaultValue = convertAttributeDefaultValue(item);
            }

            // Remove undefined values
            Object.keys(updateData).forEach((key) => {
              if (updateData[key] === undefined) {
                delete updateData[key];
              }
            });

            switch (type) {
              case 'attributes':
                await db.attributes.update(id, updateData);
                break;
              case 'items':
                await db.items.update(id, updateData);
                break;
              case 'actions':
                await db.actions.update(id, updateData);
                break;
            }
            updatedCount++;
          } else {
            // Create new record
            const newRecord: Record<string, unknown> = {
              ...item,
              id: id || crypto.randomUUID(),
              rulesetId: activeRuleset.id,
              createdAt: now,
              updatedAt: now,
            };

            // Convert defaultValue for attributes
            if (type === 'attributes') {
              newRecord.defaultValue = convertAttributeDefaultValue(item);
            }

            // Set default values for items if not provided
            if (type === 'items') {
              newRecord.weight = newRecord.weight ?? 0;
              newRecord.defaultQuantity = newRecord.defaultQuantity ?? 1;
              newRecord.stackSize = newRecord.stackSize ?? 1;
              newRecord.isContainer = newRecord.isContainer ?? false;
              newRecord.isStorable = newRecord.isStorable ?? true;
              newRecord.isEquippable = newRecord.isEquippable ?? false;
              newRecord.isConsumable = newRecord.isConsumable ?? false;
              newRecord.inventoryWidth = newRecord.inventoryWidth ?? 1;
              newRecord.inventoryHeight = newRecord.inventoryHeight ?? 1;
            }

            // Remove undefined values
            Object.keys(newRecord).forEach((key) => {
              if (newRecord[key] === undefined) {
                delete newRecord[key];
              }
            });

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
          }
        } catch (e) {
          console.error('Failed to import/update item:', item, e);
        }
      }

      const messages: string[] = [];
      if (importedCount > 0) messages.push(`imported ${importedCount}`);
      if (updatedCount > 0) messages.push(`updated ${updatedCount}`);

      return {
        success: true,
        message: `Successfully ${messages.join(' and ')} ${type}`,
        importedCount,
        updatedCount,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importedCount: 0,
        updatedCount: 0,
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
