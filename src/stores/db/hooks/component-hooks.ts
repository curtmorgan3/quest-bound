import { deleteAssetIfUnreferenced } from './asset-hooks';
import type { DB } from './types';

export function registerComponentDbHooks(db: DB) {
  // Do not cascade-delete asset when component is deleted (asset may be shared)

  // Delete asset only when no longer referenced after a component clears its asset
  db.components.hook('updating', (modifications, _primKey, obj) => {
    const originalData = JSON.parse(obj?.data ?? '{}');
    const originalAssetId =
      originalData.assetId ?? originalData.checkedAssetId ?? originalData.uncheckedAssetId;

    const mods = modifications as { data?: string | null };
    const data = JSON.parse(mods?.data ?? '{}');
    const assetId = data.assetId ?? data.checkedAssetId ?? data.uncheckedAssetId;

    if ('assetId' in data && !assetId && originalAssetId) {
      setTimeout(() => {
        deleteAssetIfUnreferenced(db, originalAssetId).catch((error) =>
          console.error('Failed to delete unreferenced asset for component:', error),
        );
      }, 0);
    }
  });
}
