import type { Asset } from '@/types';
import type { FieldType } from './types';

/**
 * Parses a TSV string into an array of rows (each row is an array of cell values)
 */
export function parseTsv(tsvString: string): string[][] {
  const lines = tsvString.split('\n');
  return lines
    .map((line) => line.replace(/\r/g, '').split('\t'))
    .filter((row) => row.some((cell) => cell.trim() !== '')); // Filter out empty rows
}

/**
 * Converts a TSV value back to its proper type
 */
export function parseTsvValue(value: string, fieldType: FieldType): unknown {
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
export function tsvToObjects(
  rows: string[][],
  fieldTypes: Record<string, FieldType>,
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
export function convertAttributeDefaultValue(
  item: Record<string, unknown>,
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

/**
 * Compare two version strings (e.g. "1.2.3"). Returns -1 if a < b, 0 if equal, 1 if a > b.
 * Falls back to string comparison for non-semver strings.
 */
export function compareVersion(a: string, b: string): number {
  const parse = (v: string) => v.split('.').map((n) => (Number.isNaN(Number(n)) ? 0 : Number(n)));
  const partsA = parse(a);
  const partsB = parse(b);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const na = partsA[i] ?? 0;
    const nb = partsB[i] ?? 0;
    if (na !== nb) return na < nb ? -1 : 1;
  }
  return 0;
}

export function isImageUrl(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

/**
 * Escapes a value for TSV format.
 * - Converts arrays to pipe-separated strings
 * - Converts booleans to "true"/"false"
 * - Escapes tabs and newlines
 * - Handles undefined/null as empty string
 */
export function escapeTsvValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join('|');
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  const str = String(value);
  // Replace tabs and newlines to preserve TSV structure
  return str.replace(/\t/g, '    ').replace(/\n/g, '\\n').replace(/\r/g, '');
}

/**
 * Converts an array of objects to TSV format.
 * For the 'image' column, only includes the value when it is a URL (http/https).
 */
export function convertToTsv<T extends Record<string, unknown>>(
  data: T[],
  columns: (keyof T)[],
  imageColumn: keyof T = 'image',
): string {
  // Create header row
  const header = columns.join('\t');

  // Create data rows; for image column, only include value when it's a URL
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col];
        if (col === imageColumn && columns.includes(imageColumn)) {
          return isImageUrl(value as string) ? escapeTsvValue(value) : '';
        }
        return escapeTsvValue(value);
      })
      .join('\t'),
  );

  return [header, ...rows].join('\n');
}

/**
 * Relative path for an asset inside the export zip, matching `use-import-ruleset` keys for
 * `assetFilenameToIdMap` (directory + basename when `directory` is set; else basename).
 * Basename matches zip file naming when `filename` is missing.
 */
export function assetZipRelativePath(
  asset: Pick<Asset, 'id' | 'filename' | 'directory' | 'type'>,
): string {
  const fileExtension = asset.type.split('/')[1] || 'bin';
  const basename =
    asset.filename && String(asset.filename).trim() !== ''
      ? asset.filename
      : `asset_${asset.id}.${fileExtension}`;
  if (asset.directory) {
    const directoryPath = String(asset.directory).replace(/^\/+|\/+$/g, '');
    if (directoryPath) {
      return `${directoryPath}/${basename}`;
    }
  }
  return basename;
}

/** Map asset id → path string stored in TSV `assetFilename` and used on import to resolve `assetId`. */
export function buildAssetFilenameMap(assets: Asset[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const asset of assets) {
    map[asset.id] = assetZipRelativePath(asset);
  }
  return map;
}
