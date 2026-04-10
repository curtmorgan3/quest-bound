import { Evaluator } from '@/lib/compass-logic/interpreter/evaluator';
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';
import { OwnerAccessor, RulesetAccessor } from '@/lib/compass-logic/runtime/accessors';
import { ScriptRunner } from '@/lib/compass-logic/runtime/script-runner';
import type { Attribute, Asset, Character, CharacterAttribute, Chart, InventoryItem, Item } from '@/types';
import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@/stores/db/hooks/types';

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
        rowWhere: (sourceCol: string, sourceVal: any) => {
          if (sourceCol === 'Level' && sourceVal === 5) {
            return {
              valueInColumn: (targetCol: string) => {
                if (targetCol === 'HP') {
                  return 100;
                }
                return 0;
              },
            };
          }
          return {
            valueInColumn: () => 0,
          };
        },
      };

      const mockRuleset = {
        Chart: () => mockChart,
      };

      evaluator.globalEnv.define('Ruleset', mockRuleset);

      const script = `
chart = Ruleset.Chart("LevelTable")
hp = chart.rowWhere("Level", 5).valueInColumn("HP")
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
        rowWhere: (sourceCol: string, sourceVal: any) => {
          if (sourceCol === 'Level' && sourceVal === 3) {
            return {
              valueInColumn: (targetCol: string) => {
                if (targetCol === 'HP') {
                  return 50;
                }
                return 0;
              },
            };
          }
          return {
            valueInColumn: () => 0,
          };
        },
      };

      const mockRuleset = {
        Chart: () => mockChart,
      };

      evaluator.globalEnv.define('Ruleset', mockRuleset);

      const script = `
table = getChart("LevelTable")
hp = table.rowWhere("Level", 3).valueInColumn("HP")
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

  describe('Owner.setImage with asset and URL images', () => {
    it('sets character.image to URL and clears assetId when given a direct URL', async () => {
      const now = '2024-01-01T00:00:00.000Z';

      const character: Character = {
        id: 'char1',
        rulesetId: 'ruleset1',
        userId: 'user1',
        inventoryId: 'inv1',
        name: 'Test Character',
        assetId: null,
        image: null,
        isTestCharacter: false,
        componentData: {},
        pinnedSidebarDocuments: [],
        pinnedSidebarCharts: [],
        createdAt: now,
        updatedAt: now,
      };

      const mockDb = {
        // Minimal shape for ScriptRunner.loadCache
        attributes: { where: () => ({ toArray: () => Promise.resolve<Attribute[]>([]) }) },
        charts: { where: () => ({ toArray: () => Promise.resolve<Chart[]>([]) }) },
        items: { where: () => ({ toArray: () => Promise.resolve<Item[]>([]) }) },
        actions: { where: () => ({ toArray: () => Promise.resolve([]) }) },
        characters: {
          get: (id: string) => Promise.resolve(id === character.id ? character : null),
          update: vi.fn(),
        },
        customProperties: {
          where: () => ({ equals: () => ({ toArray: () => Promise.resolve([]) }) }),
        },
        characterAttributes: { where: () => ({ toArray: () => Promise.resolve<CharacterAttribute[]>([]) }) },
        characterArchetypes: {
          where: () => ({ equals: () => ({ toArray: () => Promise.resolve([]) }) }),
        },
        scripts: {
          where: () => ({ filter: () => ({ toArray: () => Promise.resolve([]) }) }),
        },
        inventories: {
          where: () => ({ equals: () => ({ toArray: () => Promise.resolve([]) }) }),
        },
        inventoryItems: {
          where: () => ({ equals: () => ({ toArray: () => Promise.resolve<InventoryItem[]>([]) }) }),
        },
        archetypes: { where: () => ({ equals: () => ({ toArray: () => Promise.resolve([]) }) }), get: () => Promise.resolve(null) },
        assets: {
          where: () => ({
            equals: () => ({
              first: () => Promise.resolve<Asset | undefined>(undefined),
            }),
          }),
        },
        components: {
          where: vi.fn().mockReturnValue({
            equals: vi.fn().mockReturnValue({
              filter: vi.fn().mockReturnValue({
                toArray: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        },
      } as unknown as DB;

      const context = {
        ownerId: character.id,
        rulesetId: character.rulesetId,
        db: mockDb,
      };

      const runner = new ScriptRunner(context);
      await runner.loadCache();

      const script = `
Owner.setImage("https://example.com/portrait.png")
`;

      const result = await runner.run(script);
      expect(result.error).toBeUndefined();

      await runner.flushCache();

      expect((mockDb.characters as any).update).toHaveBeenCalledWith(
        character.id,
        expect.objectContaining({
          assetId: null,
          image: 'https://example.com/portrait.png',
        }),
      );
    });

    it('sets character.assetId when given an asset filename and falls back when not found', async () => {
      const now = '2024-01-01T00:00:00.000Z';

      const character: Character = {
        id: 'char2',
        rulesetId: 'ruleset-asset',
        userId: 'user1',
        inventoryId: 'inv2',
        name: 'Asset Character',
        assetId: null,
        image: null,
        isTestCharacter: false,
        componentData: {},
        pinnedSidebarDocuments: [],
        pinnedSidebarCharts: [],
        createdAt: now,
        updatedAt: now,
      };

      const portraitAsset: Asset = {
        id: 'asset-portrait',
        data: 'data:image/png;base64,xxx',
        type: 'image/png',
        filename: 'portrait.png',
        rulesetId: character.rulesetId,
        createdAt: now,
        updatedAt: now,
      };

      const charactersUpdateSpy = vi.fn();

      const mockDb = {
        attributes: { where: () => ({ toArray: () => Promise.resolve<Attribute[]>([]) }) },
        charts: { where: () => ({ toArray: () => Promise.resolve<Chart[]>([]) }) },
        items: { where: () => ({ toArray: () => Promise.resolve<Item[]>([]) }) },
        actions: { where: () => ({ toArray: () => Promise.resolve([]) }) },
        characters: {
          get: (id: string) => Promise.resolve(id === character.id ? character : null),
          update: charactersUpdateSpy,
        },
        customProperties: {
          where: () => ({ equals: () => ({ toArray: () => Promise.resolve([]) }) }),
        },
        characterAttributes: { where: () => ({ toArray: () => Promise.resolve<CharacterAttribute[]>([]) }) },
        characterArchetypes: {
          where: () => ({ equals: () => ({ toArray: () => Promise.resolve([]) }) }),
        },
        scripts: {
          where: () => ({ filter: () => ({ toArray: () => Promise.resolve([]) }) }),
        },
        inventories: {
          where: () => ({ equals: () => ({ toArray: () => Promise.resolve([]) }) }),
        },
        inventoryItems: {
          where: () => ({ equals: () => ({ toArray: () => Promise.resolve<InventoryItem[]>([]) }) }),
        },
        archetypes: { where: () => ({ equals: () => ({ toArray: () => Promise.resolve([]) }) }), get: () => Promise.resolve(null) },
        assets: {
          where: (_index: string) => ({
            equals: ([rulesetId, filename]: [string, string]) => ({
              first: () =>
                Promise.resolve(
                  rulesetId === character.rulesetId && filename === portraitAsset.filename
                    ? portraitAsset
                    : undefined,
                ),
            }),
          }),
        },
        components: {
          where: vi.fn().mockReturnValue({
            equals: vi.fn().mockReturnValue({
              filter: vi.fn().mockReturnValue({
                toArray: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        },
      } as unknown as DB;

      const context = {
        ownerId: character.id,
        rulesetId: character.rulesetId,
        db: mockDb,
      };

      const runner = new ScriptRunner(context);
      await runner.loadCache();

      // First, use an existing asset filename
      const scriptUseAsset = `
Owner.setImage("portrait.png")
`;
      const resultUseAsset = await runner.run(scriptUseAsset);
      expect(resultUseAsset.error).toBeUndefined();
      await runner.flushCache();

      expect(charactersUpdateSpy).toHaveBeenCalledWith(
        character.id,
        expect.objectContaining({
          assetId: portraitAsset.id,
        }),
      );

      // Then, use a non-existent filename; should fall back to storing image string and clearing assetId
      const scriptFallback = `
Owner.setImage("nonexistent.png")
`;
      const resultFallback = await runner.run(scriptFallback);
      expect(resultFallback.error).toBeUndefined();
      await runner.flushCache();

      expect(charactersUpdateSpy).toHaveBeenCalledWith(
        character.id,
        expect.objectContaining({
          assetId: null,
          image: 'nonexistent.png',
        }),
      );
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
      expect(attrProxy?.value).toBe(50);
      expect(attrProxy?.title).toBe('HP');
      expect(attrProxy?.description).toBe('Hit Points');
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
      attrProxy?.add(10);

      expect(attrProxy?.value).toBe(60);
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

      // valueInColumn defaults to first data row when not chained from rowWhere()
      const firstRowHpBonus = chart.valueInColumn('HP Bonus');
      expect(firstRowHpBonus).toBe(10);

      // When chained from rowWhere(), valueInColumn uses the matching row
      const rowProxy = chart.rowWhere('Level', 5);
      const chainedHpBonus = rowProxy.valueInColumn('HP Bonus');
      expect(chainedHpBonus).toBe(20);
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

    it('should return all item instances when Items() is called without a name', () => {
      const swordItem: Item = {
        id: 'item_sword',
        rulesetId: 'ruleset1',
        title: 'Sword',
        description: '',
        weight: 0,
        defaultQuantity: 1,
        stackSize: 1,
        isContainer: false,
        isStorable: true,
        isConsumable: false,
        isEquippable: false,
        inventoryWidth: 1,
        inventoryHeight: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      const itemsCache = new Map<string, Item>();
      itemsCache.set('item_potion', potionItem);
      itemsCache.set('item_sword', swordItem);
      const invPotion: InventoryItem = {
        id: 'inv_p',
        type: 'item',
        entityId: 'item_potion',
        inventoryId: 'inv1',
        componentId: '',
        quantity: 1,
        x: 0,
        y: 0,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      const invSword: InventoryItem = {
        id: 'inv_s',
        type: 'item',
        entityId: 'item_sword',
        inventoryId: 'inv1',
        componentId: '',
        quantity: 1,
        x: 0,
        y: 0,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      const invAction: InventoryItem = {
        id: 'inv_a',
        type: 'action',
        entityId: 'act1',
        inventoryId: 'inv1',
        componentId: '',
        quantity: 1,
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
        [invPotion, invSword, invAction],
      );
      const all = owner.Items();
      expect(all).toHaveLength(2);
      const titles = all.map((i) => i.title).sort();
      expect(titles).toEqual(['Potion', 'Sword']);
    });

    it('should scope Items() without name to inventory component when referenceLabel is set', () => {
      const itemsCache = new Map<string, Item>();
      itemsCache.set('item_potion', potionItem);
      const compId = 'comp_bag';
      const refMap = new Map([['bag', compId]]);
      const invInBag: InventoryItem = {
        id: 'inv_bag',
        type: 'item',
        entityId: 'item_potion',
        inventoryId: 'inv1',
        componentId: compId,
        quantity: 2,
        x: 0,
        y: 0,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      const invElsewhere: InventoryItem = {
        id: 'inv_other',
        type: 'item',
        entityId: 'item_potion',
        inventoryId: 'inv1',
        componentId: 'other_comp',
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
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        itemsCache,
        [invInBag, invElsewhere],
        new Set(),
        new Map(),
        null,
        undefined,
        [],
        {},
        0,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        refMap,
      );
      const inBag = owner.Items(undefined, 'bag');
      expect(inBag).toHaveLength(1);
      expect(inBag[0].quantity).toBe(2);
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

  describe('Self on item instance', () => {
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

    it('getItemByInstanceId returns the correct instance when character has multiple instances of same item', () => {
      const itemsCache = new Map<string, Item>();
      itemsCache.set('item_potion', potionItem);
      const invFirst: InventoryItem = {
        id: 'inv_first',
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
      const invSecond: InventoryItem = {
        id: 'inv_second',
        type: 'item',
        entityId: 'item_potion',
        inventoryId: 'inv1',
        componentId: '',
        quantity: 5,
        x: 1,
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
        [invFirst, invSecond],
      );

      const byFirst = owner.getItemByInstanceId('inv_first');
      const bySecond = owner.getItemByInstanceId('inv_second');

      expect(byFirst).toBeDefined();
      expect(bySecond).toBeDefined();
      expect(byFirst?.quantity).toBe(2);
      expect(bySecond?.quantity).toBe(5);
      expect(byFirst?.title).toBe('Potion');
      expect(bySecond?.title).toBe('Potion');
    });

    it('Owner.Item(name) returns first instance when multiple exist (unchanged behavior)', () => {
      const itemsCache = new Map<string, Item>();
      itemsCache.set('item_potion', potionItem);
      const invFirst: InventoryItem = {
        id: 'inv_first',
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
      const invSecond: InventoryItem = {
        id: 'inv_second',
        type: 'item',
        entityId: 'item_potion',
        inventoryId: 'inv1',
        componentId: '',
        quantity: 5,
        x: 1,
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
        [invFirst, invSecond],
      );

      const firstByTitle = owner.Item('Potion');
      expect(firstByTitle?.quantity).toBe(2);
      expect(firstByTitle?.title).toBe('Potion');
    });

    it('removeItemByInstanceId removes only the specified instance', () => {
      const pendingUpdates = new Map<string, any>();
      const itemsCache = new Map<string, Item>();
      itemsCache.set('item_potion', potionItem);
      const invFirst: InventoryItem = {
        id: 'inv_first',
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
      const invSecond: InventoryItem = {
        id: 'inv_second',
        type: 'item',
        entityId: 'item_potion',
        inventoryId: 'inv1',
        componentId: '',
        quantity: 5,
        x: 1,
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
        [invFirst, invSecond],
      );

      owner.removeItemByInstanceId('inv_second');

      expect(owner.Items('Potion')).toHaveLength(1);
      expect(owner.Items('Potion')[0].quantity).toBe(2);
      expect(owner.Items('Potion')[0].title).toBe('Potion');
      expect(pendingUpdates.get('inventoryDelete:inv_second')).toBe(true);
      expect(pendingUpdates.has('inventoryDelete:inv_first')).toBe(false);
    });

    it('Self.destroy() removes only that instance (via getItemByInstanceId proxy)', () => {
      const pendingUpdates = new Map<string, any>();
      const itemsCache = new Map<string, Item>();
      itemsCache.set('item_potion', potionItem);
      const invFirst: InventoryItem = {
        id: 'inv_first',
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
      const invSecond: InventoryItem = {
        id: 'inv_second',
        type: 'item',
        entityId: 'item_potion',
        inventoryId: 'inv1',
        componentId: '',
        quantity: 5,
        x: 1,
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
        [invFirst, invSecond],
      );

      const secondInstance = owner.getItemByInstanceId('inv_second');
      expect(secondInstance).toBeDefined();
      secondInstance!.destroy();

      expect(owner.Items('Potion')).toHaveLength(1);
      expect(owner.Items('Potion')[0].quantity).toBe(2);
      expect(pendingUpdates.get('inventoryDelete:inv_second')).toBe(true);
      expect(pendingUpdates.has('inventoryDelete:inv_first')).toBe(false);
    });

    it('getItemByInstanceId returns undefined for unknown id', () => {
      const itemsCache = new Map<string, Item>();
      itemsCache.set('item_potion', potionItem);
      const invEntry: InventoryItem = {
        id: 'inv_1',
        type: 'item',
        entityId: 'item_potion',
        inventoryId: 'inv1',
        componentId: '',
        quantity: 1,
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

      expect(owner.getItemByInstanceId('nonexistent')).toBeUndefined();
    });

    it('ScriptRunner with inventoryItemInstanceId sets Self to that specific instance', async () => {
      const invFirst: InventoryItem = {
        id: 'inv_first',
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
      const invSecond: InventoryItem = {
        id: 'inv_second',
        type: 'item',
        entityId: 'item_potion',
        inventoryId: 'inv1',
        componentId: '',
        quantity: 5,
        x: 1,
        y: 0,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      const inventoryItems = [invFirst, invSecond];

      const emptyArray = () => Promise.resolve([]);
      const mockDb = {
        attributes: { where: () => ({ toArray: emptyArray }) },
        charts: { where: () => ({ toArray: emptyArray }) },
        items: {
          where: () => ({
            toArray: () => Promise.resolve([potionItem]),
          }),
        },
        actions: { where: () => ({ toArray: emptyArray }) },
        customProperties: {
          where: () => ({ equals: () => ({ toArray: emptyArray }) }),
        },
        characters: {
          get: () =>
            Promise.resolve({
              name: 'Test',
              inventoryId: 'inv1',
              customProperties: {},
            }),
        },
        inventoryItems: {
          where: () => ({
            equals: () => ({ toArray: () => Promise.resolve(inventoryItems) }),
          }),
        },
        characterAttributes: { where: () => ({ toArray: emptyArray }) },
        characterArchetypes: {
          where: () => ({ equals: () => ({ toArray: emptyArray }) }),
        },
        scripts: {
          where: () => ({ filter: () => ({ toArray: emptyArray }) }),
        },
        archetypes: { get: () => Promise.resolve(null) },
        components: {
          where: vi.fn().mockReturnValue({
            equals: vi.fn().mockReturnValue({
              filter: vi.fn().mockReturnValue({
                toArray: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        },
      } as unknown as DB;

      const context = {
        ownerId: 'char1',
        rulesetId: 'ruleset1',
        db: mockDb,
        entityType: 'item' as const,
        entityId: 'item_potion',
        inventoryItemInstanceId: 'inv_second',
      };

      const runner = new ScriptRunner(context);
      const result = await runner.run('Self.quantity');

      expect(result.error).toBeUndefined();
      expect(result.value).toBe(5);
    });
  });
});
