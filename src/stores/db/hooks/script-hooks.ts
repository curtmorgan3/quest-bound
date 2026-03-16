import { buildDependencyGraph } from '@/lib/compass-logic/reactive/dependency-graph';
import { getSyncState } from '@/lib/cloud/sync/sync-state';
import type { DB } from './types';

const DEPENDENCY_GRAPH_DEBOUNCE_MS = 400;

/** Debounce rebuilds by rulesetId so rapid edits or multiple tabs don't trigger many full rebuilds in parallel. */
function createDebouncedRebuild(db: DB) {
  const timeoutsByRuleset = new Map<string, ReturnType<typeof setTimeout>>();

  return function scheduleRebuild(rulesetId: string) {
    const existing = timeoutsByRuleset.get(rulesetId);
    if (existing) clearTimeout(existing);

    const timeoutId = setTimeout(async () => {
      timeoutsByRuleset.delete(rulesetId);
      try {
        await buildDependencyGraph(rulesetId, db);
      } catch (error) {
        console.error('Failed to rebuild dependency graph:', error);
      }
    }, DEPENDENCY_GRAPH_DEBOUNCE_MS);

    timeoutsByRuleset.set(rulesetId, timeoutId);
  };
}

export function registerScriptHooks(db: DB) {
  const scheduleDependencyGraphRebuild = createDebouncedRebuild(db);

  const safeDeleteDependencyGraphNodesByRulesetId = async (rulesetId: string) => {
    try {
      await db.dependencyGraphNodes.where({ rulesetId }).delete();
    } catch (error) {
      console.error(
        '[DB] Failed to delete dependency graph nodes for ruleset. This may indicate an outdated IndexedDB schema. Consider clearing local data or letting the app migrate the database.',
        error,
      );
    }
  };

  // Hook for when scripts are created or updated - rebuild dependency graph (debounced)
  db.scripts.hook('creating', async (primKey, obj) => {
    if (getSyncState().isSyncing) return;
    const rulesetId = obj.rulesetId;
    if (rulesetId) {
      setTimeout(() => scheduleDependencyGraphRebuild(rulesetId), 0);
    }
  });

  db.scripts.hook('updating', async (modifications, primKey, obj) => {
    if (getSyncState().isSyncing) return;
    const mods = modifications as {
      sourceCode?: string;
      enabled?: boolean;
      entityType?: string;
      entityId?: string | null;
    };
    const associationChanged = mods.entityType !== undefined || mods.entityId !== undefined;
    const needsRebuild =
      mods.sourceCode !== undefined || mods.enabled !== undefined || associationChanged;

    if (needsRebuild) {
      const script = await db.scripts.get(primKey);
      if (script) {
        setTimeout(() => scheduleDependencyGraphRebuild(script.rulesetId), 0);
      }
    }
  });

  // Hook for when scripts are deleted
  db.scripts.hook('deleting', async (primKey) => {
    if (getSyncState().isSyncing) return;
    const scriptId = primKey as string;
    const script = await db.scripts.get(scriptId);

    setTimeout(async () => {
      // Clean up script associations when script is deleted
      await db.attributes.where({ scriptId }).modify({ scriptId: null });
      await db.actions.where({ scriptId }).modify({ scriptId: null });
      await db.items.where({ scriptId }).modify({ scriptId: null });
      await db.archetypes.where({ scriptId }).modify({ scriptId: null });
      await db.campaignEvents.where({ scriptId }).modify({ scriptId: null });

      // Delete associated errors and logs
      await db.scriptErrors.where({ scriptId }).delete();
    }, 0);

    if (script) {
      setTimeout(() => scheduleDependencyGraphRebuild(script.rulesetId), 0);
    }
  });

  // Hook for when entities are deleted - clean up their scripts
  db.attributes.hook('deleting', async (primKey) => {
    if (getSyncState().isSyncing) return;
    setTimeout(async () => {
      const attributeId = primKey as string;
      const attribute = await db.attributes.get(attributeId);
      if (attribute?.scriptId) {
        await db.scripts.delete(attribute.scriptId);
      }
    }, 0);
  });

  db.actions.hook('deleting', async (primKey) => {
    if (getSyncState().isSyncing) return;
    setTimeout(async () => {
      const actionId = primKey as string;
      const action = await db.actions.get(actionId);
      if (action?.scriptId) {
        await db.scripts.delete(action.scriptId);
      }
    }, 0);
  });

  db.items.hook('deleting', async (primKey) => {
    if (getSyncState().isSyncing) return;
    setTimeout(async () => {
      const itemId = primKey as string;
      const item = await db.items.get(itemId);
      if (item?.scriptId) {
        await db.scripts.delete(item.scriptId);
      }
    }, 0);
  });

  // Hook for when rulesets are deleted - clean up all scripts and dependency graph
  db.rulesets.hook('deleting', async (primKey) => {
    if (getSyncState().isSyncing) return;
    const rulesetId = primKey as string;
    setTimeout(async () => {
      await db.scripts.where({ rulesetId }).delete();
      await db.scriptErrors.where({ rulesetId }).delete();
      await db.scriptLogs.where({ rulesetId }).delete();
      await safeDeleteDependencyGraphNodesByRulesetId(rulesetId);
    }, 0);
    try {
    } catch (e) {
      console.warn('Ruleset hook delete');
    }
  });
}
