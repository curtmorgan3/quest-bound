import { buildDependencyGraph } from '@/lib/compass-logic/reactive/dependency-graph';
import type { DB } from './types';

export function registerItemDbHooks(db: DB) {
  // Clean up dependency graph when item's script is replaced
  db.items.hook('updating', (modifications, _primKey, obj) => {
    const mods = modifications as { scriptId?: string | null };
    if (mods.scriptId !== undefined && obj.rulesetId) {
      buildDependencyGraph(obj.rulesetId!, db).catch((error) =>
        console.error('Failed to rebuild dependency graph:', error),
      );
    }
  });

  // Delete itemCustomProperties and associated asset when an item is deleted
  db.items.hook('deleting', (primKey, obj) => {
    const itemId = primKey as string;
    const assetId = obj?.assetId;
    setTimeout(async () => {
      try {
        await db.itemCustomProperties.where('itemId').equals(itemId).delete();
        if (assetId) {
          await db.assets.delete(assetId);
        }
      } catch (error) {
        console.error('Failed to delete item custom properties or asset for item:', error);
      }
    }, 0);
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
