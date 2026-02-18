import { describe, it, expect } from 'vitest';
import { injectCharacterData } from '@/lib/compass-planes/utils/inject-character-data';
import type { Attribute, Character, CharacterAttribute } from '@/types';

describe('injectCharacterData', () => {
  const mockAttributes: Attribute[] = [
    {
      id: 'attr-1',
      rulesetId: 'ruleset-1',
      title: 'Strength',
      description: 'Physical strength',
      type: 'number',
      defaultValue: 10,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'attr-2',
      rulesetId: 'ruleset-1',
      title: 'Dexterity',
      description: 'Agility and reflexes',
      type: 'number',
      defaultValue: 10,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'attr-3',
      rulesetId: 'ruleset-1',
      title: 'Class',
      description: 'Character class',
      type: 'string',
      defaultValue: 'Fighter',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  const mockCharacter: Character = {
    id: 'char-1',
    userId: 'user-1',
    rulesetId: 'ruleset-1',
    inventoryId: 'inv-1',
    name: 'Aragorn',
    assetId: null,
    image: null,
    isTestCharacter: false,
    componentData: {},
    pinnedSidebarDocuments: [],
    pinnedSidebarCharts: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockGetCharacterAttribute = (attributeId: string): CharacterAttribute | null => {
    const attributeValues: Record<string, any> = {
      'attr-1': 18,
      'attr-2': 14,
      'attr-3': 'Ranger',
    };

    const attribute = mockAttributes.find((a) => a.id === attributeId);
    if (!attribute) return null;

    return {
      ...attribute,
      characterId: 'char-1',
      attributeId,
      value: attributeValues[attributeId],
    };
  };

  it('should return non-string values unchanged', () => {
    const numberValue = 42;
    const result = injectCharacterData({
      value: numberValue,
      attributes: mockAttributes,
    });
    expect(result).toBe(42);

    const boolValue = true;
    const result2 = injectCharacterData({
      value: boolValue,
      attributes: mockAttributes,
    });
    expect(result2).toBe(true);
  });

  it('should replace {{name}} with character name', () => {
    const result = injectCharacterData({
      value: 'Hello, {{name}}!',
      attributes: mockAttributes,
      characterData: mockCharacter,
    });
    expect(result).toBe('Hello, Aragorn!');
  });

  it('should replace attribute placeholder with character attribute value', () => {
    const result = injectCharacterData({
      value: 'Your strength is {{strength}}',
      attributes: mockAttributes,
      getCharacterAttribute: mockGetCharacterAttribute,
    });
    expect(result).toBe('Your strength is 18');
  });

  it('should handle case-insensitive attribute matching', () => {
    const result = injectCharacterData({
      value: 'Your STRENGTH is {{STRENGTH}} and dexterity is {{dexterity}}',
      attributes: mockAttributes,
      getCharacterAttribute: mockGetCharacterAttribute,
    });
    expect(result).toBe('Your STRENGTH is 18 and dexterity is 14');
  });

  it('should replace multiple placeholders in one string', () => {
    const result = injectCharacterData({
      value: '{{name}} the {{class}} has {{strength}} strength',
      attributes: mockAttributes,
      getCharacterAttribute: mockGetCharacterAttribute,
      characterData: mockCharacter,
    });
    expect(result).toBe('Aragorn the Ranger has 18 strength');
  });

  it('should leave placeholder unchanged if attribute not found', () => {
    const result = injectCharacterData({
      value: 'Your {{nonexistent}} attribute',
      attributes: mockAttributes,
      getCharacterAttribute: mockGetCharacterAttribute,
    });
    expect(result).toBe('Your {{nonexistent}} attribute');
  });

  it('should leave {{name}} unchanged if characterData not provided', () => {
    const result = injectCharacterData({
      value: 'Hello, {{name}}!',
      attributes: mockAttributes,
    });
    expect(result).toBe('Hello, {{name}}!');
  });

  it('should handle empty string', () => {
    const result = injectCharacterData({
      value: '',
      attributes: mockAttributes,
    });
    expect(result).toBe('');
  });

  it('should handle string with no placeholders', () => {
    const result = injectCharacterData({
      value: 'This is a plain string',
      attributes: mockAttributes,
    });
    expect(result).toBe('This is a plain string');
  });

  it('should handle malformed placeholders', () => {
    const result = injectCharacterData({
      value: 'This has {{incomplete and {{}} empty',
      attributes: mockAttributes,
    });
    expect(result).toBe('This has {{incomplete and {{}} empty');
  });

  it('should handle placeholder with whitespace', () => {
    const result = injectCharacterData({
      value: 'Your {{ strength }} is high',
      attributes: mockAttributes,
      getCharacterAttribute: mockGetCharacterAttribute,
    });
    expect(result).toBe('Your 18 is high');
  });

  it('should handle attribute value that is 0', () => {
    const getAttrWithZero = (attributeId: string): CharacterAttribute | null => {
      if (attributeId === 'attr-1') {
        return {
          ...mockAttributes[0],
          characterId: 'char-1',
          attributeId: 'attr-1',
          value: 0,
        };
      }
      return null;
    };

    const result = injectCharacterData({
      value: 'Value is {{strength}}',
      attributes: mockAttributes,
      getCharacterAttribute: getAttrWithZero,
    });
    expect(result).toBe('Value is 0');
  });

  it('should handle attribute value that is false', () => {
    const boolAttribute: Attribute = {
      id: 'attr-bool',
      rulesetId: 'ruleset-1',
      title: 'IsActive',
      description: 'Active status',
      type: 'boolean',
      defaultValue: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const getAttrWithFalse = (attributeId: string): CharacterAttribute | null => {
      if (attributeId === 'attr-bool') {
        return {
          ...boolAttribute,
          characterId: 'char-1',
          attributeId: 'attr-bool',
          value: false,
        };
      }
      return null;
    };

    const result = injectCharacterData({
      value: 'Active: {{isactive}}',
      attributes: [boolAttribute],
      getCharacterAttribute: getAttrWithFalse,
    });
    expect(result).toBe('Active: false');
  });

  it('should handle attribute value that is null', () => {
    const getAttrWithNull = (attributeId: string): CharacterAttribute | null => {
      if (attributeId === 'attr-1') {
        return {
          ...mockAttributes[0],
          characterId: 'char-1',
          attributeId: 'attr-1',
          value: null as any,
        };
      }
      return null;
    };

    const result = injectCharacterData({
      value: 'Value is {{strength}}',
      attributes: mockAttributes,
      getCharacterAttribute: getAttrWithNull,
    });
    expect(result).toBe('Value is {{strength}}');
  });

  it('should handle attribute value that is undefined', () => {
    const getAttrWithUndefined = (attributeId: string): CharacterAttribute | null => {
      if (attributeId === 'attr-1') {
        return {
          ...mockAttributes[0],
          characterId: 'char-1',
          attributeId: 'attr-1',
          value: undefined as any,
        };
      }
      return null;
    };

    const result = injectCharacterData({
      value: 'Value is {{strength}}',
      attributes: mockAttributes,
      getCharacterAttribute: getAttrWithUndefined,
    });
    expect(result).toBe('Value is {{strength}}');
  });

  it('should handle missing getCharacterAttribute function', () => {
    const result = injectCharacterData({
      value: 'Your {{strength}} is high',
      attributes: mockAttributes,
    });
    expect(result).toBe('Your {{strength}} is high');
  });

  it('should handle consecutive placeholders', () => {
    const result = injectCharacterData({
      value: '{{name}}{{name}}',
      attributes: mockAttributes,
      characterData: mockCharacter,
    });
    expect(result).toBe('AragornAragorn');
  });

  it('should handle string with only placeholders', () => {
    const result = injectCharacterData({
      value: '{{name}}',
      attributes: mockAttributes,
      characterData: mockCharacter,
    });
    expect(result).toBe('Aragorn');
  });
});
