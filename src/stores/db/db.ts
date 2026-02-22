import type {
  Action,
  Archetype,
  Asset,
  Attribute,
  Campaign,
  CampaignCharacter,
  CampaignEvent,
  CampaignEventLocation,
  CampaignItem,
  Character,
  CharacterAttribute,
  CharacterArchetype,
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
  Location,
  Page,
  Ruleset,
  RulesetPage,
  RulesetWindow,
  Script,
  ScriptError,
  ScriptLog,
  Tile,
  Tilemap,
  User,
  Window,
  World,
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
  pages: EntityTable<Page, 'id'>;
  rulesetPages: EntityTable<RulesetPage, 'id'>;
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
  worlds: EntityTable<World, 'id'>;
  tilemaps: EntityTable<Tilemap, 'id'>;
  tiles: EntityTable<Tile, 'id'>;
  locations: EntityTable<Location, 'id'>;
  campaigns: EntityTable<Campaign, 'id'>;
  campaignCharacters: EntityTable<CampaignCharacter, 'id'>;
  campaignItems: EntityTable<CampaignItem, 'id'>;
  campaignEvents: EntityTable<CampaignEvent, 'id'>;
  campaignEventLocations: EntityTable<CampaignEventLocation, 'id'>;
};

db.version(38).stores(dbSchema).upgrade((tx) => {
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
