import type Dexie from 'dexie';

export type DB = Dexie & {
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
  users: Dexie.Table;
};
