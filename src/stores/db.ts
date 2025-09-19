import type { Attribute, Ruleset, User } from '@/types';
import Dexie, { type EntityTable } from 'dexie';

const db = new Dexie('qbdb') as Dexie & {
  users: EntityTable<
    User,
    'id' // primary key "id" (for the typings only)
  >;
  rulesets: EntityTable<Ruleset, 'id'>;
  attributes: EntityTable<Attribute, 'id'>;
};

const common = '++id, createdAt, updatedAt';

// Schema declaration:
db.version(1).stores({
  users: `${common}, username, avatar, preferences`,
  rulesets: `${common}, version, createdBy, title, description, details, image`,
  attributes: `${common}, rulesetId, title, description, category, type, options, defaultValue, optionsChartRef, optionsChartColumnHeader, min, max`,
});

export { db };
