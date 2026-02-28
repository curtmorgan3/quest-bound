import type { DB } from './types';

export function registerTilemapDbHooks(db: DB) {
  // Do not cascade-delete asset when tilemap is deleted (asset may be shared)
}
