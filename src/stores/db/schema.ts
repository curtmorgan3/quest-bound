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

const common = '++id, createdAt, updatedAt';

// Schema declaration:
db.version(17).stores({
  users: `${common}, username, assetId, image, preferences`,
  assets: `${common}, rulesetId, [directory+filename], data, type`,
  rulesets: `${common}, version, createdBy, title, description, details, assetId, image`,
  fonts: `${common}, rulesetId, label, data`,
  attributes: `${common}, rulesetId, title, description, category, type, options, defaultValue, optionsChartRef, optionsChartColumnHeader, min, max, scriptId`,
  actions: `${common}, rulesetId, title, description, category, scriptId`,
  items: `${common}, rulesetId, title, description, category, weight, defaultQuantity, stackSize, isContainer, isStorable, isEquippable, isConsumable, inventoryWidth, inventoryHeight, scriptId`,
  charts: `${common}, rulesetId, title, description, category, data, assetId, image`,
  documents: `${common}, rulesetId, title, description, category, assetId, image, pdfAssetId, pdfData`,
  windows: `${common}, rulesetId, title, category`,
  components: `${common}, rulesetId, windowId, type, x, y, z, height, width, rotation, selected, assetId, assetUrl, groupId, attributeId, actionId, data, style`,
  characters: `${common}, rulesetId, userId, assetId, image`,
  inventories: `${common}, rulesetId, characterId, title, category, type`,
  inventoryItems: `${common}, characterId, inventoryId, entityId, quantity`,
  characterPages: `${common}, characterId, label`,
  characterWindows: `${common}, characterId, characterPageId, windowId, title, x, y, isCollapsed`,
  characterAttributes: `${common}, characterId, attributeId, &[characterId+attributeId], scriptDisabled`,
  diceRolls: `${common}, rulesetId, userId, value, label`,
  scripts: `${common}, rulesetId, name, entityType, entityId, isGlobal, enabled`,
  scriptErrors: `${common}, rulesetId, scriptId, characterId, timestamp`,
  dependencyGraphNodes: `${common}, rulesetId, scriptId, entityType, entityId`,
});

export { db };
