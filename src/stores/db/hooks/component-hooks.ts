import type { DB } from './types';

export function registerComponentDbHooks(db: DB) {
  // Delete associated asset when an item is deleted
  db.components.hook('deleting', (_primKey, obj) => {
    const data = JSON.parse(obj?.data ?? '{}');
    const assetId = data.assetId ?? data.checkedAssetId ?? data.uncheckedAssetId;

    if (assetId) {
      setTimeout(async () => {
        try {
          await db.assets.delete(assetId);
        } catch (error) {
          console.error('Failed to delete asset for component:', error);
        }
      }, 0);
    }
  });

  // Delete old asset when an component's asset is removed
  db.components.hook('updating', (modifications, _primKey, obj) => {
    const originalData = JSON.parse(obj?.data ?? '{}');
    const originalAssetId =
      originalData.assetId ?? originalData.checkedAssetId ?? originalData.uncheckedAssetId;

    const mods = modifications as { data?: string | null };
    const data = JSON.parse(mods?.data ?? '{}');
    const assetId = data.assetId ?? data.checkedAssetId ?? data.uncheckedAssetId;

    // Check if assetId is being set to null/undefined and there was a previous asset
    if ('assetId' in data && !assetId && originalData.assetId) {
      setTimeout(async () => {
        try {
          await db.assets.delete(originalAssetId);
        } catch (error) {
          console.error('Failed to delete old asset for component:', error);
        }
      }, 0);
    }
  });
}
