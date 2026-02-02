import type { DB } from './types';

export function registerItemDbHooks(db: DB) {
  // Delete associated asset when an item is deleted
  db.items.hook('deleting', (_primKey, obj) => {
    if (obj?.assetId) {
      setTimeout(async () => {
        try {
          await db.assets.delete(obj.assetId);
        } catch (error) {
          console.error('Failed to delete asset for item:', error);
        }
      }, 0);
    }
  });

  // Delete old asset when an item's asset is removed
  db.items.hook('updating', (modifications, _primKey, obj) => {
    const mods = modifications as { assetId?: string | null };
    // Check if assetId is being set to null/undefined and there was a previous asset
    if ('assetId' in mods && !mods.assetId && obj?.assetId) {
      setTimeout(async () => {
        try {
          await db.assets.delete(obj.assetId);
        } catch (error) {
          console.error('Failed to delete old asset for item:', error);
        }
      }, 0);
    }
  });
}
