import type { Action, Asset, Attribute, Chart, Item, Ruleset, User } from '@/types';
import Dexie, { type EntityTable } from 'dexie';
import { assetInjectorMiddleware } from './asset-injector-middleware';
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
  assets: EntityTable<Asset, 'id'>;
};

const common = '++id, createdAt, updatedAt';

// Schema declaration:
db.version(1).stores({
  users: `${common}, username, assetId, image, preferences`,
  assets: `${common}, data, type, filename, rulesetId`,
  rulesets: `${common}, version, createdBy, title, description, details, assetId, image`,
  attributes: `${common}, &[rulesetId+title], description, category, type, options, defaultValue, optionsChartRef, optionsChartColumnHeader, min, max`,
  actions: `${common}, &[rulesetId+title], description, category`,
  items: `${common}, &[rulesetId+title], description, category, weight, defaultQuantity, stackSize, isContainer, isStorable, isEquippable, isConsumable, inventoryWidth, inventoryHeight`,
  charts: `${common}, &[rulesetId+title], description, category, data`,
});

// Cache assets for reference in the asset injector middleware
db.on('ready', async () => {
  await db.assets
    .where('id')
    .above(0)
    .each((asset) => {
      memoizedAssets[asset.id] = asset.data;
    });
});

db.use(assetInjectorMiddleware);

export { db };
