import type Dexie from 'dexie';
import { registerActionDbHooks } from './action-hooks';
import { registerAttributeDbHooks } from './attribute-hooks';
import { registerCharacterDbHooks } from './character-hooks';
import { registerChartDbHooks } from './chart-hooks';
import { registerDocumentDbHooks } from './document-hooks';
import { registerItemDbHooks } from './item-hooks';
import { registerRulesetDbHooks } from './ruleset-hooks';

type DB = Dexie & {
  rulesets: Dexie.Table;
  attributes: Dexie.Table;
  items: Dexie.Table;
  actions: Dexie.Table;
  charts: Dexie.Table;
  assets: Dexie.Table;
  windows: Dexie.Table;
  components: Dexie.Table;
  fonts: Dexie.Table;
  characters: Dexie.Table;
  inventories: Dexie.Table;
  inventoryItems: Dexie.Table;
  characterAttributes: Dexie.Table;
  characterWindows: Dexie.Table;
  documents: Dexie.Table;
};

export function registerDbHooks(db: DB) {
  registerRulesetDbHooks(db);
  registerChartDbHooks(db);
  registerAttributeDbHooks(db);
  registerCharacterDbHooks(db);
  registerItemDbHooks(db);
  registerActionDbHooks(db);
  registerDocumentDbHooks(db);
}
