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
  dbSchemaV59,
  dbSchemaV60,
  dbSchemaV61,
  dbSchemaV62,
  dbSchemaV63,
  dbSchemaV64,
  dbSchemaV65,
  dbSchemaV66,
  dbSchemaV67,
} from '../schema/versions/versions';
import { migrate32to33 } from './migrate-32-to-33';
import { migrate38to39 } from './migrate-38-to-39';
import { migrate41to42 } from './migrate-41-to-42';
import { migrate43to44 } from './migrate-43-to-44';
import { migrate51to52 } from './migrate-51-to-52';
import { migrate57to58 } from './migrate-57-to-58';
import { migrate58to59 } from './migrate-58-to-59';
import { migrate59to60 } from './migrate-59-to-60';
import { migrate60to61 } from './migrate-60-to-61';
import { migrate61to62 } from './migrate-61-to-62';
import { migrate62to63 } from './migrate-62-to-63';
import { migrate63to64 } from './migrate-63-to-64';
import { migrate64to65 } from './migrate-64-to-65';
import { migrate65to66 } from './migrate-65-to-66';
import { migrate66to67 } from './migrate-66-to-67';

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
  db.version(58).stores(dbSchemaV58).upgrade(migrate57to58);
  db.version(59).stores(dbSchemaV59).upgrade(migrate58to59);
  db.version(60).stores(dbSchemaV60).upgrade(migrate59to60);
  db.version(61).stores(dbSchemaV61).upgrade(migrate60to61);
  db.version(62).stores(dbSchemaV62).upgrade(migrate61to62);
  db.version(63).stores(dbSchemaV63).upgrade(migrate62to63);
  db.version(64).stores(dbSchemaV64).upgrade(migrate63to64);
  db.version(65).stores(dbSchemaV65).upgrade(migrate64to65);
  db.version(66).stores(dbSchemaV66).upgrade(migrate65to66);
  db.version(dbSchemaVersion).stores(dbSchemaV67).upgrade(migrate66to67);
}
