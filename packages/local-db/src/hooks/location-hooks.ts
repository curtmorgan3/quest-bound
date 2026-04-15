import type { DB } from './types';

export function registerLocationDbHooks(db: DB) {
  // Do not cascade-delete assets when location is deleted (assets may be shared)
}
