import type { DB } from './types';

export function registerScriptHooks(db: DB) {
  // Hook for when scripts are deleted
  db.scripts.hook('deleting', async (primKey) => {
    const scriptId = primKey as string;
    
    // Clean up script associations when script is deleted
    await db.attributes.where({ scriptId }).modify({ scriptId: null });
    await db.actions.where({ scriptId }).modify({ scriptId: null });
    await db.items.where({ scriptId }).modify({ scriptId: null });
    
    // Delete associated errors
    await db.scriptErrors.where({ scriptId }).delete();
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
  
  // Hook for when rulesets are deleted - clean up all scripts
  db.rulesets.hook('deleting', async (primKey) => {
    const rulesetId = primKey as string;
    await db.scripts.where({ rulesetId }).delete();
    await db.scriptErrors.where({ rulesetId }).delete();
  });
}
