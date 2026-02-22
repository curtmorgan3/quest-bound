import type { DB } from './types';

export function registerTilemapDbHooks(db: DB) {
  // Delete associated asset when a tilemap is deleted
  db.tilemaps.hook('deleting', (_primKey, obj) => {
    if (obj?.assetId) {
      setTimeout(async () => {
        try {
          await db.assets.delete(obj.assetId);
        } catch (error) {
          console.error('Failed to delete asset for tilemap:', error);
        }
      }, 0);
    }
  });
}
