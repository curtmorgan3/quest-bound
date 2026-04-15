import { describe, it, expect } from 'vitest';
import {
  sanitizeFileName,
  parseScriptPath,
  generateScriptPath,
  validateScriptForExport,
  validateScriptPath,
  findDuplicateScriptNames,
  generateUniqueScriptName,
} from '@/lib/compass-api/hooks/export/script-utils';
import type { Script } from '@/types';

describe('sanitizeFileName', () => {
  it('should convert to lowercase', () => {
    expect(sanitizeFileName('MyScript')).toBe('myscript');
  });

  it('should replace spaces with underscores', () => {
    expect(sanitizeFileName('My Script Name')).toBe('my_script_name');
  });

  it('should remove special characters', () => {
    expect(sanitizeFileName('My@Script#Name!')).toBe('myscriptname');
  });

  it('should preserve hyphens and underscores', () => {
    expect(sanitizeFileName('my-script_name')).toBe('my-script_name');
  });

  it('should remove consecutive underscores', () => {
    expect(sanitizeFileName('my___script')).toBe('my_script');
  });

  it('should remove leading and trailing underscores', () => {
    expect(sanitizeFileName('_my_script_')).toBe('my_script');
  });

  it('should handle empty string', () => {
    expect(sanitizeFileName('')).toBe('unnamed');
  });

  it('should handle null/undefined', () => {
    expect(sanitizeFileName(null as any)).toBe('unnamed');
    expect(sanitizeFileName(undefined as any)).toBe('unnamed');
  });

  it('should handle complex names', () => {
    expect(sanitizeFileName('Max Hit Points (HP)')).toBe('max_hit_points_hp');
  });

  it('should handle names with only special characters', () => {
    expect(sanitizeFileName('!@#$%^&*()')).toBe('unnamed');
  });
});

describe('parseScriptPath', () => {
  it('should parse attribute script path', () => {
    const result = parseScriptPath('scripts/attributes/hit_points.qbs');
    expect(result).toEqual({
      entityType: 'attribute',
      name: 'hit_points',
    });
  });

  it('should parse action script path', () => {
    const result = parseScriptPath('scripts/actions/cast_spell.qbs');
    expect(result).toEqual({
      entityType: 'action',
      name: 'cast_spell',
    });
  });

  it('should parse item script path', () => {
    const result = parseScriptPath('scripts/items/health_potion.qbs');
    expect(result).toEqual({
      entityType: 'item',
      name: 'health_potion',
    });
  });

  it('should parse global script path', () => {
    const result = parseScriptPath('scripts/global/utils.qbs');
    expect(result).toEqual({
      entityType: 'global',
      name: 'utils',
    });
  });

  it('should handle paths with leading slash', () => {
    const result = parseScriptPath('/scripts/attributes/strength.qbs');
    expect(result).toEqual({
      entityType: 'attribute',
      name: 'strength',
    });
  });

  it('should handle paths with trailing slash', () => {
    const result = parseScriptPath('scripts/attributes/strength.qbs/');
    // Trailing slash is removed during normalization, so this should still parse correctly
    expect(result).toEqual({
      entityType: 'attribute',
      name: 'strength',
    });
  });

  it('should return null for invalid path format', () => {
    expect(parseScriptPath('invalid/path.qbs')).toBeNull();
    expect(parseScriptPath('scripts/hit_points.qbs')).toBeNull();
    expect(parseScriptPath('scripts/attributes/hit_points.txt')).toBeNull();
  });

  it('should return null for unknown entity type', () => {
    expect(parseScriptPath('scripts/unknown/script.qbs')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseScriptPath('')).toBeNull();
  });
});

describe('generateScriptPath', () => {
  it('should generate path for attribute script', () => {
    expect(generateScriptPath('attribute', 'Hit Points')).toBe('scripts/attributes/hit_points.qbs');
  });

  it('should generate path for action script', () => {
    expect(generateScriptPath('action', 'Cast Spell')).toBe('scripts/actions/cast_spell.qbs');
  });

  it('should generate path for item script', () => {
    expect(generateScriptPath('item', 'Health Potion')).toBe('scripts/items/health_potion.qbs');
  });

  it('should generate path for global script', () => {
    expect(generateScriptPath('global', 'Utils')).toBe('scripts/global/utils.qbs');
  });

  it('should sanitize complex names', () => {
    expect(generateScriptPath('attribute', 'Max Hit Points (HP)')).toBe(
      'scripts/attributes/max_hit_points_hp.qbs',
    );
  });

  it('should handle names with special characters', () => {
    expect(generateScriptPath('action', 'Fire@Ball!')).toBe('scripts/actions/fireball.qbs');
  });
});

describe('validateScriptForExport', () => {
  const createMockScript = (overrides?: Partial<Script>): Script => ({
    id: 'script-123',
    rulesetId: 'ruleset-456',
    name: 'test_script',
    sourceCode: 'return 42;',
    entityType: 'attribute',
    entityId: 'entity-789',
    isGlobal: false,
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  it('should validate a valid script', () => {
    const script = createMockScript();
    const errors = validateScriptForExport(script);
    expect(errors).toHaveLength(0);
  });

  it('should validate a global script without entityId', () => {
    const script = createMockScript({
      isGlobal: true,
      entityId: null,
      entityType: 'global',
    });
    const errors = validateScriptForExport(script);
    expect(errors).toHaveLength(0);
  });

  it('should fail if name is missing', () => {
    const script = createMockScript({ name: '' });
    const errors = validateScriptForExport(script);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('name'))).toBe(true);
  });

  it('should fail if sourceCode is missing', () => {
    const script = createMockScript({ sourceCode: '' });
    const errors = validateScriptForExport(script);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('sourceCode'))).toBe(true);
  });

  it('should fail if sourceCode is empty/whitespace', () => {
    const script = createMockScript({ sourceCode: '   ' });
    const errors = validateScriptForExport(script);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('empty'))).toBe(true);
  });

  it('should fail if entityType is invalid', () => {
    const script = createMockScript({ entityType: 'invalid' as any });
    const errors = validateScriptForExport(script);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('entityType'))).toBe(true);
  });

  it('should fail if non-global script has no entityId', () => {
    const script = createMockScript({ isGlobal: false, entityId: null });
    const errors = validateScriptForExport(script);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('entityId'))).toBe(true);
  });
});

describe('validateScriptPath', () => {
  it('should validate a valid attribute script path', () => {
    const errors = validateScriptPath('scripts/attributes/hit_points.qbs');
    expect(errors).toHaveLength(0);
  });

  it('should validate a valid action script path', () => {
    const errors = validateScriptPath('scripts/actions/cast_spell.qbs');
    expect(errors).toHaveLength(0);
  });

  it('should validate a valid item script path', () => {
    const errors = validateScriptPath('scripts/items/health_potion.qbs');
    expect(errors).toHaveLength(0);
  });

  it('should validate a valid global script path', () => {
    const errors = validateScriptPath('scripts/global/utils.qbs');
    expect(errors).toHaveLength(0);
  });

  it('should fail if path does not end with .qbs', () => {
    const errors = validateScriptPath('scripts/attributes/hit_points.txt');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('.qbs'))).toBe(true);
  });

  it('should fail if path format is invalid', () => {
    const errors = validateScriptPath('invalid/path.qbs');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('Invalid script path'))).toBe(true);
  });

  it('should fail if path is empty', () => {
    const errors = validateScriptPath('');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('required'))).toBe(true);
  });
});

describe('findDuplicateScriptNames', () => {
  const createMockScript = (name: string, id: string): Script => ({
    id,
    rulesetId: 'ruleset-456',
    name,
    sourceCode: 'return 42;',
    entityType: 'attribute',
    entityId: 'entity-789',
    isGlobal: false,
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  });

  it('should find no duplicates in unique names', () => {
    const scripts = [
      createMockScript('script1', 'id1'),
      createMockScript('script2', 'id2'),
      createMockScript('script3', 'id3'),
    ];
    const duplicates = findDuplicateScriptNames(scripts);
    expect(duplicates.size).toBe(0);
  });

  it('should find duplicates', () => {
    const scripts = [
      createMockScript('script1', 'id1'),
      createMockScript('script1', 'id2'),
      createMockScript('script2', 'id3'),
    ];
    const duplicates = findDuplicateScriptNames(scripts);
    expect(duplicates.size).toBe(1);
    expect(duplicates.get('script1')).toBe(2);
  });

  it('should find multiple duplicates', () => {
    const scripts = [
      createMockScript('script1', 'id1'),
      createMockScript('script1', 'id2'),
      createMockScript('script2', 'id3'),
      createMockScript('script2', 'id4'),
      createMockScript('script2', 'id5'),
    ];
    const duplicates = findDuplicateScriptNames(scripts);
    expect(duplicates.size).toBe(2);
    expect(duplicates.get('script1')).toBe(2);
    expect(duplicates.get('script2')).toBe(3);
  });

  it('should handle empty array', () => {
    const duplicates = findDuplicateScriptNames([]);
    expect(duplicates.size).toBe(0);
  });
});

describe('generateUniqueScriptName', () => {
  it('should return original name if not in set', () => {
    const existingNames = new Set(['script1', 'script2']);
    const result = generateUniqueScriptName('script3', existingNames);
    expect(result).toBe('script3');
  });

  it('should append _2 if name exists', () => {
    const existingNames = new Set(['script1', 'script2']);
    const result = generateUniqueScriptName('script1', existingNames);
    expect(result).toBe('script1_2');
  });

  it('should increment counter if _2 exists', () => {
    const existingNames = new Set(['script1', 'script1_2']);
    const result = generateUniqueScriptName('script1', existingNames);
    expect(result).toBe('script1_3');
  });

  it('should find next available number', () => {
    const existingNames = new Set(['script1', 'script1_2', 'script1_3', 'script1_4']);
    const result = generateUniqueScriptName('script1', existingNames);
    expect(result).toBe('script1_5');
  });

  it('should handle empty set', () => {
    const existingNames = new Set<string>();
    const result = generateUniqueScriptName('script1', existingNames);
    expect(result).toBe('script1');
  });
});
