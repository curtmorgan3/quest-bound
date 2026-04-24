import { buildDependencyGraph } from '@/lib/compass-logic/reactive/dependency-graph';
import { getSyncState } from '@/lib/cloud/sync/sync-state';
import { getQBScriptClient } from '@/lib/compass-logic/worker';
import { deleteAssetIfUnreferenced } from './asset-hooks';
import type { DB } from './types';

export function registerItemDbHooks(db: DB) {
  // Clean up dependency graph when item's script is replaced
  db.items.hook('updating', (modifications, _primKey, obj) => {
    if (getSyncState().isSyncing) return;
    const mods = modifications as { scriptId?: string | null };
    if (mods.scriptId !== undefined && obj.rulesetId) {
      buildDependencyGraph(obj.rulesetId!, db)
        .then(() => {
          try {
            getQBScriptClient().clearGraph(obj.rulesetId!);
          } catch {
            // Worker may not be initialized yet
          }
        })
        .catch((error) => console.error('Failed to rebuild dependency graph:', error));
    }
  });

  // Delete itemCustomProperties when an item is deleted (asset is not cascade-deleted; may be shared)
  db.items.hook('deleting', (primKey) => {
    if (getSyncState().isSyncing) return;
    const itemId = primKey as string;
    setTimeout(async () => {
      try {
        await db.itemCustomProperties.where('itemId').equals(itemId).delete();
      } catch (error) {
        console.error('Failed to delete item custom properties for item:', error);
      }
    }, 0);
  });

  // Delete asset only when no longer referenced after an item clears its asset
  db.items.hook('updating', (modifications, _primKey, obj) => {
    if (getSyncState().isSyncing) return;
    const mods = modifications as { assetId?: string | null };
    if ('assetId' in mods && !mods.assetId && obj?.assetId) {
      const assetId = obj.assetId;
      setTimeout(() => {
        deleteAssetIfUnreferenced(db, assetId).catch((error) =>
          console.error('Failed to delete unreferenced asset for item:', error),
        );
      }, 0);
    }
  });
}
