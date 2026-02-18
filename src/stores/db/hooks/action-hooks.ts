import { buildDependencyGraph } from '@/lib/compass-logic/reactive/dependency-graph';
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

  // Delete associated asset when an action is deleted
  db.actions.hook('deleting', (_primKey, obj) => {
    if (obj?.assetId) {
      setTimeout(async () => {
        try {
          await db.assets.delete(obj.assetId);
        } catch (error) {
          console.error('Failed to delete asset for action:', error);
        }
      }, 0);
    }
  });

  // Delete old asset when an action's asset is removed
  db.actions.hook('updating', (modifications, _primKey, obj) => {
    const mods = modifications as { assetId?: string | null };
    // Check if assetId is being set to null/undefined and there was a previous asset
    if ('assetId' in mods && !mods.assetId && obj?.assetId) {
      setTimeout(async () => {
        try {
          await db.assets.delete(obj.assetId);
        } catch (error) {
          console.error('Failed to delete old asset for action:', error);
        }
      }, 0);
    }
  });
}
