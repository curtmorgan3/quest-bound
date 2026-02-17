import { Evaluator } from '@/lib/compass-logic/interpreter/evaluator';
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';
import { OwnerAccessor, RulesetAccessor } from '@/lib/compass-logic/runtime/accessors';
import type { Attribute, CharacterAttribute, Chart, InventoryItem, Item } from '@/types';
import { describe, expect, it } from 'vitest';

/**
 * These are simplified integration tests that test the script execution
 * without a real database. Full integration tests with IndexedDB should
 * be run in a browser environment (e.g., Cypress).
 */
describe('ScriptRunner Integration Tests', () => {
  describe('parser and evaluator with method calls', () => {
    it('should parse and evaluate chained method calls', async () => {
      const evaluator = new Evaluator();

      // Create a simple mock object with chainable methods
      const mockAttribute = {
        value: 10,
        add(amount: number) {
          this.value += amount;
        },
        multiply(factor: number) {
          this.value *= factor;
        },
      };

      const mockOwner = {
        Attribute: () => mockAttribute,
      };

      evaluator.globalEnv.define('Owner', mockOwner);

      const script = `
Owner.Attribute("HP").add(5)
Owner.Attribute("HP").multiply(2)
Owner.Attribute("HP").value
`;

      const tokens = new Lexer(script).tokenize();
      const ast = new Parser(tokens).parse();
      const result = await evaluator.eval(ast);

      expect(result).toBe(30); // (10 + 5) * 2 = 30
    });

    it('should handle member access on returned objects', async () => {
      const evaluator = new Evaluator();

      const mockRuleset = {
        Attribute: (name: string) => ({
          title: name,
          description: `Description of ${name}`,
        }),
      };

      evaluator.globalEnv.define('Ruleset', mockRuleset);

      const script = `
attr = Ruleset.Attribute("HP")
attr.description
`;

      const tokens = new Lexer(script).tokenize();
      const ast = new Parser(tokens).parse();
      const result = await evaluator.eval(ast);

      expect(result).toBe('Description of HP');
    });

    it('should work with method calls that return values', async () => {
      const evaluator = new Evaluator();

      const mockChart = {
        where: (sourceCol: string, sourceVal: any, targetCol: string) => {
          if (sourceCol === 'Level' && sourceVal === 5 && targetCol === 'HP') {
            return 100;
          }
          return 0;
        },
      };

      const mockRuleset = {
        Chart: () => mockChart,
      };

      evaluator.globalEnv.define('Ruleset', mockRuleset);

      const script = `
chart = Ruleset.Chart("LevelTable")
hp = chart.where("Level", 5, "HP")
hp
`;

      const tokens = new Lexer(script).tokenize();
      const ast = new Parser(tokens).parse();
      const result = await evaluator.eval(ast);

      expect(result).toBe(100);
    });

    it('should support getChart() helper as Ruleset.Chart(name)', async () => {
      const evaluator = new Evaluator();

      const mockChart = {
        where: (sourceCol: string, sourceVal: any, targetCol: string) => {
          if (sourceCol === 'Level' && sourceVal === 3 && targetCol === 'HP') {
            return 50;
          }
          return 0;
        },
      };

      const mockRuleset = {
        Chart: () => mockChart,
      };

      evaluator.globalEnv.define('Ruleset', mockRuleset);

      const script = `
table = getChart("LevelTable")
hp = table.where("Level", 3, "HP")
hp
`;

      const tokens = new Lexer(script).tokenize();
      const ast = new Parser(tokens).parse();
      const result = await evaluator.eval(ast);

      expect(result).toBe(50);
    });

    it('should handle null target gracefully', async () => {
      const evaluator = new Evaluator();

      evaluator.globalEnv.define('Target', null);

      const script = `
hasTarget = Target
hasTarget
`;

      const tokens = new Lexer(script).tokenize();
      const ast = new Parser(tokens).parse();
      const result = await evaluator.eval(ast);

      expect(result).toBe(null);
    });

    it('should throw error when calling methods on null', async () => {
      const evaluator = new Evaluator();

      evaluator.globalEnv.define('Target', null);

      const script = `
Target.Attribute("HP").value
`;

      const tokens = new Lexer(script).tokenize();
      const ast = new Parser(tokens).parse();

      await expect(evaluator.eval(ast)).rejects.toThrow('Cannot call method');
    });

    it('should evaluate Self as Owner.Attribute when defined (attribute script)', async () => {
      const evaluator = new Evaluator();

      const mockAttribute = {
        value: 25,
        title: 'Hit Points',
        add(amount: number) {
          this.value += amount;
        },
        subtract(amount: number) {
          this.value -= amount;
        },
        set(val: number) {
          this.value = val;
        },
      };

      const mockOwner = {
        Attribute: (name: string) => (name === 'Hit Points' ? mockAttribute : null),
      };

      evaluator.globalEnv.define('Owner', mockOwner);
      evaluator.globalEnv.define('Self', mockOwner.Attribute('Hit Points'));

      const script = `
Self.value
`;

      const tokens = new Lexer(script).tokenize();
      const ast = new Parser(tokens).parse();
      const result = await evaluator.eval(ast);

      expect(result).toBe(25);
    });

    it('should allow Self.add() and Self.value (Self same as Owner.Attribute)', async () => {
      const evaluator = new Evaluator();

      const mockAttribute = {
        value: 10,
        add(amount: number) {
          this.value += amount;
        },
      };

      const mockOwner = { Attribute: (title: string) => mockAttribute };
      evaluator.globalEnv.define('Owner', mockOwner);
      evaluator.globalEnv.define('Self', mockOwner.Attribute('Hit Points'));

      const script = `
Self.add(5)
Self.value
`;

      const tokens = new Lexer(script).tokenize();
      const ast = new Parser(tokens).parse();
      const result = await evaluator.eval(ast);

      expect(result).toBe(15);
    });

    it('should support getAttr() helper as Owner.Attribute(name).value', async () => {
      const evaluator = new Evaluator();

      const mockOwner = {
        Attribute: (name: string) => ({
          value: name === 'Hit Points' ? 42 : 0,
        }),
      };

      evaluator.globalEnv.define('Owner', mockOwner);

      const script = `
result = getAttr("Hit Points")
result
`;

      const tokens = new Lexer(script).tokenize();
      const ast = new Parser(tokens).parse();
      const result = await evaluator.eval(ast);

      expect(result).toBe(42);
    });
  });

  describe('accessor object functionality', () => {
    it('should create proper accessor structure', () => {
      // This tests that the accessors can be created with mock data
      const pendingUpdates = new Map<string, any>();
      const characterAttributesCache = new Map<string, CharacterAttribute>();
      const attributesCache = new Map<string, Attribute>();
      const itemsCache = new Map<string, Item>();

      const hpAttribute: Attribute = {
        id: 'attr_hp',
        rulesetId: 'ruleset1',
        title: 'HP',
        description: 'Hit Points',
        type: 'number',
        defaultValue: 10,
        min: 0,
        max: 100,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      const charHp: CharacterAttribute = {
        ...hpAttribute,
        characterId: 'char1',
        attributeId: 'attr_hp',
        value: 50,
      };

      attributesCache.set('attr_hp', hpAttribute);
      characterAttributesCache.set('char_hp', charHp);

      const owner = new OwnerAccessor(
        'char1',
        'Test Character',
        'inv1',
        null as any,
        pendingUpdates,
        characterAttributesCache,
        attributesCache,
        new Map(),
        itemsCache,
        [],
      );

      const attrProxy = owner.Attribute('HP');
      expect(attrProxy.value).toBe(50);
      expect(attrProxy.title).toBe('HP');
      expect(attrProxy.description).toBe('Hit Points');
    });

    it('should modify attributes through accessor', () => {
      const pendingUpdates = new Map<string, any>();
      const characterAttributesCache = new Map<string, CharacterAttribute>();
      const attributesCache = new Map<string, Attribute>();
      const itemsCache = new Map<string, Item>();

      const hpAttribute: Attribute = {
        id: 'attr_hp',
        rulesetId: 'ruleset1',
        title: 'HP',
        description: 'Hit Points',
        type: 'number',
        defaultValue: 10,
        min: 0,
        max: 100,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      const charHp: CharacterAttribute = {
        ...hpAttribute,
        id: 'char_hp',
        characterId: 'char1',
        attributeId: 'attr_hp',
        value: 50,
      };

      attributesCache.set('attr_hp', hpAttribute);
      characterAttributesCache.set('char_hp', charHp);

      const owner = new OwnerAccessor(
        'char1',
        'Test Character',
        'inv1',
        null as any,
        pendingUpdates,
        characterAttributesCache,
        attributesCache,
        new Map(),
        itemsCache,
        [],
      );

      const attrProxy = owner.Attribute('HP');
      attrProxy.add(10);

      expect(attrProxy.value).toBe(60);
      expect(pendingUpdates.get('characterAttribute:char_hp')).toBe(60);
    });

    it('should access ruleset chart data', () => {
      const attributesCache = new Map<string, Attribute>();
      const chartsCache = new Map<string, Chart>();

      const levelChart: Chart = {
        id: 'chart_levels',
        rulesetId: 'ruleset1',
        title: 'Level Table',
        description: 'Level progression data',
        data: JSON.stringify([
          ['Level', 'HP Bonus'],
          [1, 10],
          [5, 20],
        ]),
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      chartsCache.set('chart_levels', levelChart);

      const ruleset = new RulesetAccessor(
        'ruleset1',
        attributesCache,
        chartsCache,
        new Map<string, Item>(),
      );

      const chart = ruleset.Chart('Level Table');
      const hpBonus = chart.where('Level', 5, 'HP Bonus');

      expect(hpBonus).toBe(20);
    });
  });

  describe('owner accessor items', () => {
    const potionItem: Item = {
      id: 'item_potion',
      rulesetId: 'ruleset1',
      title: 'Potion',
      description: 'Restores HP',
      weight: 0,
      defaultQuantity: 1,
      stackSize: 10,
      isContainer: false,
      isStorable: true,
      isEquippable: false,
      isConsumable: true,
      inventoryWidth: 1,
      inventoryHeight: 1,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    it('should return undefined for Owner.Item when character has none', () => {
      const itemsCache = new Map<string, Item>();
      itemsCache.set('item_potion', potionItem);
      const owner = new OwnerAccessor(
        'char1',
        'Test',
        'inv1',
        null as any,
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        itemsCache,
        [],
      );
      expect(owner.Item('Potion')).toBeUndefined();
    });

    it('should return proxy for Owner.Item when character has one', () => {
      const itemsCache = new Map<string, Item>();
      itemsCache.set('item_potion', potionItem);
      const invEntry: InventoryItem = {
        id: 'inv_1',
        type: 'item',
        entityId: 'item_potion',
        inventoryId: 'inv1',
        componentId: '',
        quantity: 2,
        x: 0,
        y: 0,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      const owner = new OwnerAccessor(
        'char1',
        'Test',
        'inv1',
        null as any,
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        itemsCache,
        [invEntry],
      );
      const proxy = owner.Item('Potion');
      expect(proxy).toBeDefined();
      expect(proxy?.title).toBe('Potion');
      expect(proxy?.quantity).toBe(2);
    });

    it('should return array from Owner.Items and support hasItem', () => {
      const itemsCache = new Map<string, Item>();
      itemsCache.set('item_potion', potionItem);
      const invEntry: InventoryItem = {
        id: 'inv_1',
        type: 'item',
        entityId: 'item_potion',
        inventoryId: 'inv1',
        componentId: '',
        quantity: 3,
        x: 0,
        y: 0,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      const owner = new OwnerAccessor(
        'char1',
        'Test',
        'inv1',
        null as any,
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        itemsCache,
        [invEntry],
      );
      expect(owner.hasItem('Potion')).toBe(true);
      expect(owner.hasItem('Unknown')).toBe(false);
      const items = owner.Items('Potion');
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Potion');
      expect(items[0].quantity).toBe(3);
    });

    it('should add item via Owner.addItem and record in pendingUpdates', () => {
      const pendingUpdates = new Map<string, any>();
      const itemsCache = new Map<string, Item>();
      itemsCache.set('item_potion', potionItem);
      const owner = new OwnerAccessor(
        'char1',
        'Test',
        'inv1',
        null as any,
        pendingUpdates,
        new Map(),
        new Map(),
        new Map(),
        itemsCache,
        [],
      );
      owner.addItem('Potion', 2);
      expect(owner.hasItem('Potion')).toBe(true);
      expect(owner.Items('Potion')[0].quantity).toBe(2);
      const added = pendingUpdates.get('inventoryAdd') as InventoryItem[];
      expect(added).toHaveLength(1);
      expect(added[0].entityId).toBe('item_potion');
      expect(added[0].quantity).toBe(2);
    });

    it('should setItem to target quantity and removeItem', () => {
      const pendingUpdates = new Map<string, any>();
      const itemsCache = new Map<string, Item>();
      itemsCache.set('item_potion', potionItem);
      const invEntry: InventoryItem = {
        id: 'inv_1',
        type: 'item',
        entityId: 'item_potion',
        inventoryId: 'inv1',
        componentId: '',
        quantity: 5,
        x: 0,
        y: 0,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      const owner = new OwnerAccessor(
        'char1',
        'Test',
        'inv1',
        null as any,
        pendingUpdates,
        new Map(),
        new Map(),
        new Map(),
        itemsCache,
        [invEntry],
      );
      owner.setItem('Potion', 3);
      expect(owner.Items('Potion').reduce((sum, i) => sum + i.quantity, 0)).toBe(3);
      owner.removeItem('Potion', 2);
      expect(owner.Items('Potion').reduce((sum, i) => sum + i.quantity, 0)).toBe(1);
    });
  });
});
