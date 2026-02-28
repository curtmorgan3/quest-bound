import { buildDependencyGraph } from '@/lib/compass-logic/reactive/dependency-graph';
import { deleteAssetIfUnreferenced } from './asset-hooks';
import type { DB } from './types';

export function registerActionDbHooks(db: DB) {
  // Clean up dependency graph when action's script is replaced
  db.actions.hook('updating', (modifications, _primKey, obj) => {
    const mods = modifications as { scriptId?: string | null };
    if (mods.scriptId !== undefined && obj.rulesetId) {
      buildDependencyGraph(obj.rulesetId!, db).catch((error) =>
        console.error('Failed to rebuild dependency graph:', error),
      );
    }
  });

  // Do not cascade-delete asset when action is deleted (asset may be shared)

  // Delete asset only when no longer referenced after an action clears its asset
  db.actions.hook('updating', (modifications, _primKey, obj) => {
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
