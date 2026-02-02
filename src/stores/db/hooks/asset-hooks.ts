import type { DB } from './types';

export function registerAssetDbHooks(db: DB) {
  // Prevent deletion if an attribute references this asset
  db.assets.hook('deleting', (primKey, obj) => {
    setTimeout(async () => {
      try {
        const itemCount = await db.items.filter((item) => item.assetId === primKey).count();

        if (itemCount > 0) {
          // Re-add used asset

          db.assets.add(obj);
          return;
        }
      } catch (error) {
        console.error('Failed to delete asset for item:', error);
      }
    }, 0);
  });
}
