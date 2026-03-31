import { AttributeProxy } from '@/lib/compass-logic/runtime/proxies/attribute-proxy';
import type { Attribute, CharacterAttribute } from '@/types';
import { beforeEach, describe, expect, it } from 'vitest';

describe('AttributeProxy', () => {
  let pendingUpdates: Map<string, any>;

  beforeEach(() => {
    pendingUpdates = new Map();
  });

  describe('numeric attributes', () => {
    let numericAttribute: Attribute;
    let characterAttribute: CharacterAttribute;
    let proxy: AttributeProxy;

    beforeEach(() => {
      numericAttribute = {
        id: 'attr1',
        rulesetId: 'ruleset1',
        title: 'Hit Points',
        description: 'Character health',
        type: 'number',
        defaultValue: 10,
        min: 0,
        max: 100,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      characterAttribute = {
        ...numericAttribute,
        characterId: 'char1',
        attributeId: 'attr1',
        value: 50,
      };

      proxy = new AttributeProxy(characterAttribute, numericAttribute, pendingUpdates);
    });

    it('should get current value', () => {
      expect(proxy.value).toBe(50);
    });

    it('should set value', () => {
      proxy.set(75);
      expect(proxy.value).toBe(75);
      expect(pendingUpdates.get('characterAttribute:attr1')).toBe(75);
    });

    it('should add to value', () => {
      proxy.add(10);
      expect(proxy.value).toBe(60);
    });

    it('should subtract from value', () => {
      proxy.subtract(20);
      expect(proxy.value).toBe(30);
    });

    it('should multiply value', () => {
      proxy.multiply(2);
      expect(proxy.value).toBe(100);
    });

    it('should divide value', () => {
      proxy.divide(5);
      expect(proxy.value).toBe(10);
    });

    it('should throw error on divide by zero', () => {
      expect(() => proxy.divide(0)).toThrow('Cannot divide by zero');
    });

    it('should set to max value', () => {
      proxy.setToMax();
      expect(proxy.value).toBe(100);
    });

    it('should set to min value', () => {
      proxy.setToMin();
      expect(proxy.value).toBe(0);
    });

    it('should get description', () => {
      expect(proxy.description).toBe('Character health');
    });

    it('should get title', () => {
      expect(proxy.title).toBe('Hit Points');
    });
  });

  describe('boolean attributes', () => {
    let booleanAttribute: Attribute;
    let characterAttribute: CharacterAttribute;
    let proxy: AttributeProxy;

    beforeEach(() => {
      booleanAttribute = {
        id: 'attr2',
        rulesetId: 'ruleset1',
        title: 'Is Alive',
        description: 'Whether character is alive',
        type: 'boolean',
        defaultValue: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      characterAttribute = {
        ...booleanAttribute,
        characterId: 'char1',
        attributeId: 'attr2',
        value: true,
      };

      proxy = new AttributeProxy(characterAttribute, booleanAttribute, pendingUpdates);
    });

    it('should flip boolean value', () => {
      expect(proxy.value).toBe(true);
      proxy.flip();
      expect(proxy.value).toBe(false);
      proxy.flip();
      expect(proxy.value).toBe(true);
    });

    it('should throw error when adding to boolean', () => {
      expect(() => proxy.add(5)).toThrow('Cannot add to non-numeric attribute');
    });
  });

  describe('list attributes', () => {
    let listAttribute: Attribute;
    let characterAttribute: CharacterAttribute;
    let proxy: AttributeProxy;

    beforeEach(() => {
      listAttribute = {
        id: 'attr3',
        rulesetId: 'ruleset1',
        title: 'Alignment',
        description: 'Character alignment',
        type: 'list',
        options: ['Lawful Good', 'Neutral', 'Chaotic Evil'],
        defaultValue: 'Neutral',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      characterAttribute = {
        ...listAttribute,
        characterId: 'char1',
        attributeId: 'attr3',
        value: 'Neutral',
      };

      proxy = new AttributeProxy(characterAttribute, listAttribute, pendingUpdates);
    });

    it('should cycle to next option', () => {
      expect(proxy.value).toBe('Neutral');
      const nextValue = proxy.next();
      expect(nextValue).toBe('Chaotic Evil');
      expect(proxy.value).toBe('Chaotic Evil');
    });

    it('should wrap around when cycling next', () => {
      proxy.set('Chaotic Evil');
      const nextValue = proxy.next();
      expect(nextValue).toBe('Lawful Good');
    });

    it('should cycle to previous option', () => {
      expect(proxy.value).toBe('Neutral');
      const prevValue = proxy.prev();
      expect(prevValue).toBe('Lawful Good');
      expect(proxy.value).toBe('Lawful Good');
    });

    it('should wrap around when cycling prev', () => {
      proxy.set('Lawful Good');
      const prevValue = proxy.prev();
      expect(prevValue).toBe('Chaotic Evil');
    });

    it('should select random option', () => {
      const randomValue = proxy.setRandom();
      expect(listAttribute.options).toContain(randomValue);
      expect(proxy.value).toBe(randomValue);
    });

    it('should throw error when flipping list attribute', () => {
      expect(() => proxy.flip()).toThrow('Cannot flip non-boolean attribute');
    });

    it('should get options (from attribute or pending update)', () => {
      expect(proxy.options).toEqual(['Lawful Good', 'Neutral', 'Chaotic Evil']);
      proxy.setOptions(['A', 'B', 'C']);
      expect(proxy.options).toEqual(['A', 'B', 'C']);
    });

    it('should set options and coerce values to strings', () => {
      proxy.setOptions(['A', 'B', 'C']);
      expect(characterAttribute.options).toEqual(['A', 'B', 'C']);
      expect(pendingUpdates.get(`characterAttributeOptions:${characterAttribute.id}`)).toEqual([
        'A',
        'B',
        'C',
      ]);
    });

    it('should coerce non-string option values to strings', () => {
      proxy.setOptions([1, true, 3.14]);
      expect(characterAttribute.options).toEqual(['1', 'true', '3.14']);
    });

    it('should reset options to ruleset attribute definition', () => {
      proxy.setOptions(['X', 'Y', 'Z']);
      expect(proxy.options).toEqual(['X', 'Y', 'Z']);
      proxy.resetOptions();
      expect(proxy.options).toEqual(['Lawful Good', 'Neutral', 'Chaotic Evil']);
      expect(characterAttribute.options).toEqual(['Lawful Good', 'Neutral', 'Chaotic Evil']);
    });
  });

  describe('error handling', () => {
    it('should throw error when accessing max on attribute without max', () => {
      const attribute: Attribute = {
        id: 'attr4',
        rulesetId: 'ruleset1',
        title: 'Name',
        description: 'Character name',
        type: 'string',
        defaultValue: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      const characterAttribute: CharacterAttribute = {
        ...attribute,
        characterId: 'char1',
        attributeId: 'attr4',
        value: 'Bob',
      };

      const proxy = new AttributeProxy(characterAttribute, attribute, pendingUpdates);

      expect(() => proxy.setToMax()).toThrow('has no max value defined');
    });

    it('should return null for unknown custom property name', () => {
      const attribute: Attribute = {
        id: 'attr5',
        rulesetId: 'ruleset1',
        title: 'Notes',
        description: '',
        type: 'string',
        defaultValue: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        customProperties: JSON.stringify([
          { id: 'p1', name: 'Rank', type: 'number', defaultValue: 0 },
        ]),
      };
      const characterAttribute: CharacterAttribute = {
        ...attribute,
        characterId: 'char1',
        attributeId: 'attr5',
        value: '',
        attributeCustomPropertyValues: { p1: 3 },
      };
      const proxy = new AttributeProxy(characterAttribute, attribute, pendingUpdates);
      expect(proxy.getProperty('Rank')).toBe(3);
      expect(proxy.getProperty('Missing')).toBeNull();
      expect(proxy.getProperty('')).toBeNull();
    });

    it('should setProperty update value and queue pending entity custom props', () => {
      const attribute: Attribute = {
        id: 'attr6',
        rulesetId: 'ruleset1',
        title: 'Notes',
        description: '',
        type: 'string',
        defaultValue: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        customProperties: JSON.stringify([
          { id: 'p1', name: 'Rank', type: 'number', defaultValue: 0 },
        ]),
      };
      const characterAttribute: CharacterAttribute = {
        ...attribute,
        characterId: 'char1',
        attributeId: 'attr6',
        value: '',
        attributeCustomPropertyValues: {},
      };
      const proxy = new AttributeProxy(characterAttribute, attribute, pendingUpdates);
      proxy.setProperty('Rank', '5');
      expect(proxy.getProperty('Rank')).toBe(5);
      const key = `characterAttributeEntityCustomProps:${characterAttribute.id}`;
      expect(pendingUpdates.get(key)).toEqual({
        customProperties: attribute.customProperties ?? null,
        attributeCustomPropertyValues: { p1: 5 },
      });
    });

    it('should setProperty add new def when name not in schema', () => {
      const attribute: Attribute = {
        id: 'attr7',
        rulesetId: 'ruleset1',
        title: 'Notes',
        description: '',
        type: 'string',
        defaultValue: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      const characterAttribute: CharacterAttribute = {
        ...attribute,
        characterId: 'char1',
        attributeId: 'attr7',
        value: '',
      };
      const proxy = new AttributeProxy(characterAttribute, attribute, pendingUpdates);
      proxy.setProperty('Tag', 'hello');
      expect(proxy.getProperty('Tag')).toBe('hello');
      const key = `characterAttributeEntityCustomProps:${characterAttribute.id}`;
      const pending = pendingUpdates.get(key) as {
        customProperties: string;
        attributeCustomPropertyValues: Record<string, string>;
      };
      expect(pending.customProperties).toBeTruthy();
      const defs = JSON.parse(pending.customProperties) as Array<{
        id: string;
        name: string;
        type: string;
        defaultValue: string;
      }>;
      expect(defs).toHaveLength(1);
      expect(defs[0]!.name).toBe('Tag');
      expect(defs[0]!.type).toBe('string');
      expect(defs[0]!.defaultValue).toBe('hello');
      expect(pending.attributeCustomPropertyValues[defs[0]!.id]).toBe('hello');
    });

    it('should throw error when accessing min on attribute without min', () => {
      const attribute: Attribute = {
        id: 'attr4',
        rulesetId: 'ruleset1',
        title: 'Name',
        description: 'Character name',
        type: 'string',
        defaultValue: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      const characterAttribute: CharacterAttribute = {
        ...attribute,
        characterId: 'char1',
        attributeId: 'attr4',
        value: 'Bob',
      };

      const proxy = new AttributeProxy(characterAttribute, attribute, pendingUpdates);

      expect(() => proxy.setToMin()).toThrow('has no min value defined');
    });
  });
});
