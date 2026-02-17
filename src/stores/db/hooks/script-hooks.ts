import { buildDependencyGraph } from '@/lib/compass-logic/reactive/dependency-graph';
import type { DB } from './types';

export function registerScriptHooks(db: DB) {
  // Hook for when scripts are created or updated - rebuild dependency graph
  db.scripts.hook('creating', async (primKey, obj) => {
    // After script is created, rebuild the dependency graph for its ruleset
    const rulesetId = obj.rulesetId;
    if (rulesetId) {
      // Use setTimeout to run after the transaction completes
      setTimeout(async () => {
        try {
          await buildDependencyGraph(rulesetId, db);
        } catch (error) {
          console.error('Failed to rebuild dependency graph:', error);
        }
      }, 0);
    }
  });

  db.scripts.hook('updating', async (modifications, primKey, obj) => {
    const mods = modifications as {
      sourceCode?: string;
      enabled?: boolean;
      entityType?: string;
      entityId?: string | null;
    };
    // If source code, enabled, or entity association changed, clean up and rebuild dependency graph
    const associationChanged =
      mods.entityType !== undefined || mods.entityId !== undefined;
    const needsRebuild =
      mods.sourceCode !== undefined ||
      mods.enabled !== undefined ||
      associationChanged;

    if (needsRebuild) {
      const script = await db.scripts.get(primKey);
      if (script) {
        if (associationChanged) {
          await db.dependencyGraphNodes.where({ scriptId: primKey }).delete();
        }
        setTimeout(async () => {
          try {
            await buildDependencyGraph(script.rulesetId, db);
          } catch (error) {
            console.error('Failed to rebuild dependency graph:', error);
          }
        }, 0);
      }
    }
  });

  // Hook for when scripts are deleted
  db.scripts.hook('deleting', async (primKey) => {
    const scriptId = primKey as string;
    const script = await db.scripts.get(scriptId);

    // Clean up script associations when script is deleted
    await db.attributes.where({ scriptId }).modify({ scriptId: null });
    await db.actions.where({ scriptId }).modify({ scriptId: null });
    await db.items.where({ scriptId }).modify({ scriptId: null });

    // Delete associated errors and logs
    await db.scriptErrors.where({ scriptId }).delete();

    // Delete dependency graph nodes for this script
    await db.dependencyGraphNodes.where({ scriptId }).delete();

    // Rebuild dependency graph if we have the ruleset
    if (script) {
      setTimeout(async () => {
        try {
          await buildDependencyGraph(script.rulesetId, db);
        } catch (error) {
          console.error('Failed to rebuild dependency graph:', error);
        }
      }, 0);
    }
  });

  // Hook for when entities are deleted - clean up their scripts
  db.attributes.hook('deleting', async (primKey) => {
    const attributeId = primKey as string;
    const attribute = await db.attributes.get(attributeId);
    if (attribute?.scriptId) {
      await db.scripts.delete(attribute.scriptId);
    }
  });

  db.actions.hook('deleting', async (primKey) => {
    const actionId = primKey as string;
    const action = await db.actions.get(actionId);
    if (action?.scriptId) {
      await db.scripts.delete(action.scriptId);
    }
  });

  db.items.hook('deleting', async (primKey) => {
    const itemId = primKey as string;
    const item = await db.items.get(itemId);
    if (item?.scriptId) {
      await db.scripts.delete(item.scriptId);
    }
  });

  // Hook for when rulesets are deleted - clean up all scripts and dependency graph
  db.rulesets.hook('deleting', async (primKey) => {
    const rulesetId = primKey as string;
    await db.scripts.where({ rulesetId }).delete();
    await db.scriptErrors.where({ rulesetId }).delete();
    await db.scriptLogs.where({ rulesetId }).delete();
    await db.dependencyGraphNodes.where({ rulesetId }).delete();
  });
}
