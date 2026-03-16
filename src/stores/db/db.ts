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

// Assets and charts are lazy-loaded on first use in middleware (see asset-injector-middleware
// and chart-options-middleware). No full-table preload at ready, avoiding multi-tab memory and I/O.

db.use(assetInjectorMiddleware);
db.use(chartOptionsMiddleware);
db.use(createRulesetCascadeDeleteMiddleware(() => db));
db.use(crossTabNotifyMiddleware);
registerDbHooks(db);

initCrossTabDb();

export { db };
