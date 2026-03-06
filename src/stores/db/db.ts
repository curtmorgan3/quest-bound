import type {
  Action,
  Archetype,
  ArchetypeCustomProperty,
  Asset,
  Attribute,
  Campaign,
  CampaignCharacter,
  CampaignEvent,
  CampaignItem,
  CampaignScene,
  Character,
  CharacterAttribute,
  CharacterArchetype,
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
  Script,
  ScriptError,
  ScriptLog,
  SceneTurnCallback,
  User,
  Window,
} from '@/types';
import Dexie, { type EntityTable } from 'dexie';
import { assetInjectorMiddleware } from './asset-injector-middleware';
import { chartOptionsMiddleware, memoizedCharts } from './chart-options-middleware';
import { registerDbHooks } from './hooks/db-hooks';
import { memoizedAssets } from './memoization-cache';
import {
  dbSchema,
  dbSchemaVersion,
  dbSchemaV41,
  dbSchemaV42,
  dbSchemaV44,
  dbSchemaV45,
  dbSchemaV51,
  dbSchemaV52,
  dbSchemaV53,
} from './schema';
import { migrate41to42 } from './migrations/migrate-41-to-42';
import { migrate43to44 } from './migrations/migrate-43-to-44';
import { migrate51to52 } from './migrations/migrate-51-to-52';

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
  campaignItems: EntityTable<CampaignItem, 'id'>;
  campaignScenes: EntityTable<CampaignScene, 'id'>;
  sceneTurnCallbacks: EntityTable<SceneTurnCallback, 'id'>;
  campaignEvents: EntityTable<CampaignEvent, 'id'>;
};

db.version(41).stores(dbSchemaV41);

db.version(42).stores(dbSchemaV42).upgrade(migrate41to42);

db.version(39).stores(dbSchema).upgrade((tx) => {
  // Create a Campaign for each world that had rulesetId (upgrading from pre-Phase-7)
  const worlds = (tx as any).table('worlds');
  const campaigns = (tx as any).table('campaigns');
  return worlds.toCollection().each((world: { id: string; rulesetId?: string }) => {
    if (world.rulesetId) {
      const now = new Date().toISOString();
      return campaigns.add({
        id: crypto.randomUUID(),
        rulesetId: world.rulesetId,
        worldId: world.id,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
});

db.version(33)
  .stores({
    ...dbSchema,
    campaignEvents: `${dbSchema.campaignEvents}, type`,
  } as any)
  .upgrade((tx) => {
    // Phase 8: add type to campaignEvents (default on_activate), tileId on campaignEventLocations
    const campaignEvents = (tx as any).table('campaignEvents');
    return campaignEvents.toCollection().each((ev: { id: string; type?: string }) => {
      if (ev.type == null) {
        return campaignEvents.update(ev.id, { type: 'on_activate' });
      }
    });
  });

db.version(44).stores(dbSchemaV44).upgrade(migrate43to44);

db.version(45).stores(dbSchemaV45);

// v51 used dbSchemaV51 with no upgrade; v52 keeps the same schema and adds data migration.
db.version(51).stores(dbSchemaV51);
db.version(52).stores(dbSchemaV52).upgrade(migrate51to52);
db.version(dbSchemaVersion).stores(dbSchemaV53);

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

// Expose db and manual migration runner in dev for console use (e.g. run migration manually)
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  (window as unknown as { __QB_DB__?: typeof db }).__QB_DB__ = db;
  import('./migrations/run-migration-manually').then((m) => {
    (window as unknown as { __QB_RUN_MIGRATION_43_44?: () => Promise<{ ok: boolean; message: string }> }).__QB_RUN_MIGRATION_43_44 = () =>
      m.runMigration43to44Manually(db);
  });
}

export { db };
