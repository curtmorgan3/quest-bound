import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Script } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveRuleset } from '../rulesets/use-active-ruleset';

export const useScripts = () => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();

  const scripts = useLiveQuery(
    () =>
      db.scripts
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .toArray(),
    [activeRuleset],
  );

  const createScript = async (data: Partial<Script>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      const scriptId = crypto.randomUUID();
      await db.scripts.add({
        ...data,
        id: scriptId,
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      } as Script);
      
      // If associated with an entity, update the entity's scriptId
      if (data.entityId && data.entityType && data.entityType !== 'global') {
        const table = data.entityType === 'attribute' ? db.attributes
          : data.entityType === 'action' ? db.actions
          : db.items;
        
        await table.update(data.entityId, { scriptId });
      }
      
      return scriptId;
    } catch (e) {
      handleError(e as Error, {
        component: 'useScripts/createScript',
        severity: 'medium',
      });
    }
  };

  const updateScript = async (id: string, data: Partial<Script>) => {
    const now = new Date().toISOString();
    try {
      await db.scripts.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useScripts/updateScript',
        severity: 'medium',
      });
    }
  };

  const deleteScript = async (id: string) => {
    try {
      await db.scripts.delete(id);
      // Note: entity scriptId is set to null automatically via db hooks
    } catch (e) {
      handleError(e as Error, {
        component: 'useScripts/deleteScript',
        severity: 'medium',
      });
    }
  };

  const getScriptByEntity = async (entityType: string, entityId: string) => {
    try {
      return await db.scripts
        .where({ entityType, entityId })
        .first();
    } catch (e) {
      handleError(e as Error, {
        component: 'useScripts/getScriptByEntity',
        severity: 'low',
      });
      return null;
    }
  };

  const globalScripts = scripts?.filter(s => s.isGlobal) ?? [];

  return { 
    scripts: scripts ?? [], 
    globalScripts,
    createScript, 
    updateScript, 
    deleteScript,
    getScriptByEntity,
  };
};
