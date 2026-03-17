import type {
  Action,
  Archetype,
  ArchetypeCustomProperty,
  Asset,
  Attribute,
  Campaign,
  CampaignCharacter,
  CampaignEvent,
  CampaignScene,
  Character,
  CharacterArchetype,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Chart,
  Component,
  CustomProperty,
  DependencyGraphNode,
  DiceRoll,
  Document,
  Font,
  Inventory,
  InventoryItem,
  Item,
  ItemCustomProperty,
  Page,
  Ruleset,
  RulesetWindow,
  SceneTurnCallback,
  Script,
  ScriptError,
  ScriptLog,
  User,
  Window,
} from '@/types';
import Dexie, { type EntityTable } from 'dexie';
import { assetInjectorMiddleware } from './asset-injector-middleware';
import { chartOptionsMiddleware } from './chart-options-middleware';
import { initCrossTabDb } from './cross-tab-db';
import { crossTabNotifyMiddleware } from './cross-tab-notify-middleware';
import { registerDbHooks } from './hooks/db-hooks';
import { memoizedAssets } from './memoization-cache';
import { registerVersions } from './migrations/run-migrations';
import { createRulesetCascadeDeleteMiddleware } from './ruleset-cascade-delete-middleware';

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
  pages: EntityTable<Page, 'id'>;
  characterPages: EntityTable<CharacterPage, 'id'>;
  characterWindows: EntityTable<CharacterWindow, 'id'>;
  rulesetWindows: EntityTable<RulesetWindow, 'id'>;
  inventories: EntityTable<Inventory, 'id'>;
  inventoryItems: EntityTable<InventoryItem, 'id'>;
  diceRolls: EntityTable<DiceRoll, 'id'>;
  scripts: EntityTable<Script, 'id'>;
  scriptErrors: EntityTable<ScriptError, 'id'>;
  scriptLogs: EntityTable<ScriptLog, 'id'>;
  dependencyGraphNodes: EntityTable<DependencyGraphNode, 'id'>;
  archetypes: EntityTable<Archetype, 'id'>;
  characterArchetypes: EntityTable<CharacterArchetype, 'id'>;
  customProperties: EntityTable<CustomProperty, 'id'>;
  archetypeCustomProperties: EntityTable<ArchetypeCustomProperty, 'id'>;
  itemCustomProperties: EntityTable<ItemCustomProperty, 'id'>;
  campaigns: EntityTable<Campaign, 'id'>;
  campaignCharacters: EntityTable<CampaignCharacter, 'id'>;
  campaignScenes: EntityTable<CampaignScene, 'id'>;
  sceneTurnCallbacks: EntityTable<SceneTurnCallback, 'id'>;
  campaignEvents: EntityTable<CampaignEvent, 'id'>;
};

registerVersions(db);

// On app load, eagerly load all assets into the in-memory memoizedAssets cache so that
// asset-injector-middleware can synchronously inject image/pdf/background data for any
// record that references an assetId (regardless of table or ruleset).
db.on('ready', async () => {
  try {
    const assets = await db.assets.toArray();
    for (const asset of assets) {
      if (asset.id && asset.data != null) {
        memoizedAssets[asset.id] = asset.data as string;
      }
    }
  } catch (error) {
    // If preload fails, leave the cache empty; UI can still fall back to other paths.
    console.error('Failed to preload assets into memoized cache:', error);
  }
});

db.use(assetInjectorMiddleware);
db.use(chartOptionsMiddleware);
db.use(createRulesetCascadeDeleteMiddleware(() => db));
db.use(crossTabNotifyMiddleware);
registerDbHooks(db);

initCrossTabDb();

// When another tab (or a future open) upgrades/deletes the DB, close and reload so we don't
// hold a connection indefinitely and get a fresh schema. Avoids stuck state that only
// force-quit could fix (see agents/indexeddb-connection-loss.md).
db.on('versionchange', () => {
  db.close();
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
});
db.on('blocked', () => {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
});

export { db };
