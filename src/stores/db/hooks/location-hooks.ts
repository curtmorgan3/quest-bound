import type { DB } from './types';

export function registerLocationDbHooks(db: DB) {
  // Delete associated assets when a location is deleted
  db.locations.hook('deleting', (_primKey, obj) => {
    const assetIds = [obj?.backgroundAssetId, obj?.mapAssetId].filter(Boolean) as string[];
    if (assetIds.length === 0) return;
    setTimeout(async () => {
      for (const id of assetIds) {
        try {
          await db.assets.delete(id);
        } catch (error) {
          console.error('Failed to delete asset for location:', error);
        }
      }
    }, 0);
  });
}
