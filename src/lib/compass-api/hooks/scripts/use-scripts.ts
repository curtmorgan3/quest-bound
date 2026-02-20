import { useErrorHandler } from '@/hooks';
import { db, useApiLoadingStore } from '@/stores';
import type { Script } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useActiveRuleset } from '../rulesets/use-active-ruleset';
import { useWorld } from '../worlds/use-world';

function getEntityTable(entityType: Script['entityType']) {
  if (entityType === 'global') return;
  return entityType === 'attribute'
    ? db.attributes
    : entityType === 'action'
      ? db.actions
      : entityType === 'item'
        ? db.items
        : db.archetypes;
}

export const useScripts = (worldId?: string) => {
  const { activeRuleset } = useActiveRuleset();
  const world = useWorld(worldId);
  const { handleError } = useErrorHandler();

  const rulesetId = worldId ? world?.rulesetId : activeRuleset?.id;

  const scripts = useLiveQuery(async () => {
    if (!rulesetId) return [];
    const list = await db.scripts.where('rulesetId').equals(rulesetId).toArray();
    if (worldId != null) {
      // World scripts index: only show scripts for this world
      return list.filter((s) => s.worldId === worldId);
    }
    // Ruleset-level scripts index: only show scripts without a world
    return list.filter((s) => s.worldId == null);
  }, [rulesetId, worldId]);

  /** True while the initial query or a dependency-driven re-query is in flight. */
  const isLoading = scripts === undefined;

  useEffect(() => {
    useApiLoadingStore.getState().setLoading('scripts', isLoading);
  }, [isLoading]);

  const createScript = async (data: Partial<Script>) => {
    const effectiveRulesetId = rulesetId ?? activeRuleset?.id;
    if (!effectiveRulesetId) return;
    const now = new Date().toISOString();
    try {
      const scriptId = crypto.randomUUID();
      await db.scripts.add({
        ...data,
        id: scriptId,
        rulesetId: effectiveRulesetId,
        ...(worldId != null && { worldId }),
        createdAt: now,
        updatedAt: now,
      } as Script);

      // If associated with an entity, update the entity's scriptId
      if (data.entityId && data.entityType && data.entityType !== 'global') {
        await getEntityTable(data.entityType)?.update(data.entityId, { scriptId });
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
      const existing = await db.scripts.get(id);
      if (!existing) return;

      await db.scripts.update(id, {
        ...data,
        updatedAt: now,
      });

      const newEntityType = data.entityType ?? existing.entityType;
      const newEntityId =
        newEntityType === 'global'
          ? null
          : data.entityId !== undefined
            ? data.entityId
            : existing.entityId;

      const oldEntityId = existing.entityType !== 'global' ? existing.entityId : null;
      const oldEntityType = existing.entityType;

      // Clear scriptId on the previous entity if the association changed
      if (oldEntityId && (oldEntityId !== newEntityId || oldEntityType !== newEntityType)) {
        const oldTable = getEntityTable(oldEntityType);
        const oldEntity = await oldTable?.get(oldEntityId);
        if (oldEntity?.scriptId === id) {
          await oldTable?.update(oldEntityId, { scriptId: null });
        }
      }

      // Set scriptId on the new entity when associated with this script
      if (newEntityId && newEntityType !== 'global') {
        await getEntityTable(newEntityType)?.update(newEntityId, { scriptId: id });
      }
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
      return await db.scripts.where({ entityType, entityId }).first();
    } catch (e) {
      handleError(e as Error, {
        component: 'useScripts/getScriptByEntity',
        severity: 'low',
      });
      return null;
    }
  };

  const globalScripts = scripts?.filter((s) => s.isGlobal) ?? [];

  // Build a map of entityId -> scriptId, memoized on scripts array
  const entityToScriptMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const script of scripts ?? []) {
      if (script.entityId) {
        map.set(script.entityId, script.id);
      }
    }
    return map;
  }, [scripts]);

  // Cache for lookups to avoid repeated map access for the same entityId
  const lookupCacheRef = useRef<Map<string, string | undefined>>(new Map());

  // Reset cache when the map changes
  const prevMapRef = useRef(entityToScriptMap);
  if (prevMapRef.current !== entityToScriptMap) {
    lookupCacheRef.current.clear();
    prevMapRef.current = entityToScriptMap;
  }

  // Memoized lookup function that caches results per entityId
  const getScriptIdForEntity = useCallback(
    (entityId: string): string | undefined => {
      const cache = lookupCacheRef.current;
      if (cache.has(entityId)) {
        return cache.get(entityId);
      }
      const scriptId = entityToScriptMap.get(entityId);
      cache.set(entityId, scriptId);
      return scriptId;
    },
    [entityToScriptMap],
  );

  return {
    scripts: scripts ?? [],
    globalScripts,
    isLoading,
    rulesetId: rulesetId ?? undefined,
    createScript,
    updateScript,
    deleteScript,
    getScriptByEntity,
    getScriptIdForEntity,
  };
};
