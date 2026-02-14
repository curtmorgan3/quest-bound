import type {
  Action,
  Asset,
  Attribute,
  Character,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Chart,
  Component,
  DependencyGraphNode,
  DiceRoll,
  Document,
  Font,
  Inventory,
  InventoryItem,
  Item,
  Ruleset,
  Script,
  ScriptError,
  User,
  Window,
} from '@/types';
import Dexie, { type EntityTable } from 'dexie';
import { assetInjectorMiddleware } from './asset-injector-middleware';
import { chartOptionsMiddleware, memoizedCharts } from './chart-options-middleware';
import { registerDbHooks } from './hooks/db-hooks';
import { memoizedAssets } from './memoization-cache';
import { dbSchema, dbSchemaVersion } from './schema';

const db = new Dexie('qbdb') as Dexie & {
  users: EntityTable<
    User,
    'id' // primary key "id" (for the typings only)
  >;
  rulesets: EntityTable<Ruleset, 'id'>;
  attributes: EntityTable<Attribute, 'id'>;
  actions: EntityTable<Action, 'id'>;
  items: EntityTable<Item, 'id'>;
  charts: EntityTable<Chart, 'id'>;
  documents: EntityTable<Document, 'id'>;
  assets: EntityTable<Asset, 'id'>;
  fonts: EntityTable<Font, 'id'>;
  windows: EntityTable<Window, 'id'>;
  components: EntityTable<Component, 'id'>;
  characters: EntityTable<Character, 'id'>;
  characterAttributes: EntityTable<CharacterAttribute, 'id'>;
  characterPages: EntityTable<CharacterPage, 'id'>;
  characterWindows: EntityTable<CharacterWindow, 'id'>;
  inventories: EntityTable<Inventory, 'id'>;
  inventoryItems: EntityTable<InventoryItem, 'id'>;
  diceRolls: EntityTable<DiceRoll, 'id'>;
  scripts: EntityTable<Script, 'id'>;
  scriptErrors: EntityTable<ScriptError, 'id'>;
  dependencyGraphNodes: EntityTable<DependencyGraphNode, 'id'>;
};

db.version(dbSchemaVersion).stores(dbSchema);

// Cache assets for reference in the asset injector middleware
db.on('ready', async () => {
  await db.assets
    .where('id')
    .above(0)
    .each((asset) => {
      memoizedAssets[asset.id] = asset.data;
    });

  // Cache charts for reference in the chart options middleware
  await db.charts
    .where('id')
    .above(0)
    .each((chart) => {
      try {
        memoizedCharts[chart.id] = JSON.parse(chart.data);
      } catch {
        // Invalid JSON, skip
      }
    });
});

db.use(assetInjectorMiddleware);
db.use(chartOptionsMiddleware);
registerDbHooks(db);

export { db };
