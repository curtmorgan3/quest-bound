import type Dexie from 'dexie';
import { dbSchemaVersion } from '../schema';
import {
  dbSchema,
  dbSchemaV33,
  dbSchemaV41,
  dbSchemaV42,
  dbSchemaV44,
  dbSchemaV45,
  dbSchemaV51,
  dbSchemaV52,
  dbSchemaV56,
  dbSchemaV57,
  dbSchemaV58,
} from '../schema/versions/versions';
import { migrate32to33 } from './migrate-32-to-33';
import { migrate38to39 } from './migrate-38-to-39';
import { migrate41to42 } from './migrate-41-to-42';
import { migrate43to44 } from './migrate-43-to-44';
import { migrate51to52 } from './migrate-51-to-52';
import { migrate57to58 } from './migrate-57-to-58';

export { dbSchema };

/**
 * Registers all version schemas and upgrade callbacks on the db.
 * Call once after creating the Dexie instance, before the db is opened.
 */
export function registerVersions(db: Dexie): void {
  db.version(33)
    .stores(dbSchemaV33 as any)
    .upgrade(migrate32to33);
  db.version(39).stores(dbSchema).upgrade(migrate38to39);
  db.version(41).stores(dbSchemaV41);
  db.version(42).stores(dbSchemaV42).upgrade(migrate41to42);
  db.version(44).stores(dbSchemaV44).upgrade(migrate43to44);
  db.version(45).stores(dbSchemaV45);
  db.version(51).stores(dbSchemaV51);
  db.version(52).stores(dbSchemaV52).upgrade(migrate51to52);

  db.version(56).stores(dbSchemaV56);
  db.version(57).stores(dbSchemaV57);
  db.version(dbSchemaVersion).stores(dbSchemaV58).upgrade(migrate57to58);
}
