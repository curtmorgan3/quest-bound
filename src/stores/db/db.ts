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
  DiceRoll,
  Document,
  Font,
  Inventory,
  InventoryItem,
  Item,
  Ruleset,
  User,
  Window,
} from '@/types';
import Dexie, { type EntityTable } from 'dexie';
import { assetInjectorMiddleware } from './asset-injector-middleware';
import { chartOptionsMiddleware, memoizedCharts } from './chart-options-middleware';
import { registerDbHooks } from './hooks/db-hooks';
import { memoizedAssets } from './memoization-cache';

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
};

const common = '++id, createdAt, updatedAt';

// Schema declaration:
db.version(5).stores({
  users: `${common}, username, assetId, image, preferences`,
  assets: `${common}, rulesetId, [directory+filename], data, type`,
  rulesets: `${common}, version, createdBy, title, description, details, assetId, image`,
  fonts: `${common}, rulesetId, label, data`,
  attributes: `${common}, rulesetId, title, description, category, type, options, defaultValue, optionsChartRef, optionsChartColumnHeader, min, max`,
  actions: `${common}, rulesetId, title, description, category`,
  items: `${common}, rulesetId, title, description, category, weight, defaultQuantity, stackSize, isContainer, isStorable, isEquippable, isConsumable, inventoryWidth, inventoryHeight`,
  charts: `${common}, rulesetId, title, description, category, data`,
  documents: `${common}, rulesetId, title, description, category, assetId, image, pdfAssetId, pdfData`,
  windows: `${common}, rulesetId, title, category`,
  components: `${common}, rulesetId, windowId, type, x, y, z, height, width, rotation, selected, assetId, assetUrl, groupId, attributeId, actionId, data, style`,
  characters: `${common}, rulesetId, userId, assetId, image`,
  inventories: `${common}, rulesetId, characterId, title, category, type`,
  inventoryItems: `${common}, inventoryId, entityId, quantity`,
  characterPages: `${common}, characterId, label`,
  characterWindows: `${common}, characterId, characterPageId, windowId, title, x, y, isCollapsed, &[characterId+windowId]`,
  characterAttributes: `${common}, characterId, attributeId, &[characterId+attributeId]`,
  diceRolls: `${common}, rulesetId, userId, value, label`,
});

db.version(6).stores({
  charts: `${common}, rulesetId, title, description, category, data, assetId, image`,
});

db.version(7).stores({
  characterPages: `${common}, characterId, label`,
  characterWindows: `${common}, characterId, characterPageId, windowId, title, x, y, isCollapsed, &[characterId+windowId]`,
});

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
