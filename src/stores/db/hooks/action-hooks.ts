import { buildDependencyGraph } from '@/lib/compass-logic/reactive/dependency-graph';
import { getSyncState } from '@/lib/cloud/sync/sync-state';
import { deleteAssetIfUnreferenced } from './asset-hooks';
import type { DB } from './types';

export function registerActionDbHooks(db: DB) {
  // Clean up dependency graph when action's script is replaced.
  // Defer with setTimeout so this runs after the current transaction completes;
  // otherwise IDBTransaction only has the 'actions' store and buildDependencyGraph fails.
  db.actions.hook('updating', (modifications, _primKey, obj) => {
    if (getSyncState().isSyncing) return;
    const mods = modifications as { scriptId?: string | null };
    if (mods.scriptId !== undefined && obj.rulesetId) {
      const rulesetId = obj.rulesetId;
      setTimeout(() => {
        buildDependencyGraph(rulesetId, db).catch((error) =>
          console.error('Failed to rebuild dependency graph:', error),
        );
      }, 0);
    }
  });

  // Do not cascade-delete asset when action is deleted (asset may be shared)

  // Delete asset only when no longer referenced after an action clears its asset
  db.actions.hook('updating', (modifications, _primKey, obj) => {
    if (getSyncState().isSyncing) return;
    const mods = modifications as { assetId?: string | null };
    if ('assetId' in mods && !mods.assetId && obj?.assetId) {
      const assetId = obj.assetId;
      setTimeout(() => {
        deleteAssetIfUnreferenced(db, assetId).catch((error) =>
          console.error('Failed to delete unreferenced asset for action:', error),
        );
      }, 0);
    }
  });
}
