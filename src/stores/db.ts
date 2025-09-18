import type { User } from '@/types';
import Dexie, { type EntityTable } from 'dexie';

const db = new Dexie('qbdb') as Dexie & {
  users: EntityTable<
    User,
    'id' // primary key "id" (for the typings only)
  >;
};

const common = '++id, createdAt, updatedAt';

// Schema declaration:
db.version(1).stores({
  users: `${common}, username, avatar, preferences, rulesets`,
});

export { db };
