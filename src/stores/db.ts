import type { Ruleset, User } from '@/types';
import Dexie, { type EntityTable } from 'dexie';

const db = new Dexie('qbdb') as Dexie & {
  users: EntityTable<
    User,
    'id' // primary key "id" (for the typings only)
  >;
  rulesets: EntityTable<Ruleset, 'id'>;
};

const common = '++id, createdAt, updatedAt';

// Schema declaration:
db.version(1).stores({
  users: `${common}, username, avatar, preferences`,
  rulesets: `${common}, version, createdBy, title, description, details, image`,
});

export { db };
