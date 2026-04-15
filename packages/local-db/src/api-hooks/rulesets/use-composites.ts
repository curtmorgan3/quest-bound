import { useErrorHandler } from '@/hooks';
import { db } from '../../db';
import { useApiLoadingStore } from '@/stores/api-loading-store';
import type { Composite, CompositeVariant } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect } from 'react';
import { deleteCompositeCascade } from '@/utils/composite-db';
import { cloneComponentSubtreeForWindow } from '@/utils/composite-subtree';
import { useActiveRuleset } from './use-active-ruleset';

const VARIANT_OFFSET_X = 420;

export function useComposites() {
  const { handleError } = useErrorHandler();
  const { activeRuleset } = useActiveRuleset();
  const rulesetId = activeRuleset?.id;

  const composites = useLiveQuery(
    () =>
      rulesetId
        ? db.composites.where('rulesetId').equals(rulesetId).sortBy('name')
        : Promise.resolve([] as Composite[]),
    [rulesetId],
  );

  const compositeVariants = useLiveQuery(
    () =>
      rulesetId
        ? db.compositeVariants.where('rulesetId').equals(rulesetId).toArray()
        : Promise.resolve([] as CompositeVariant[]),
    [rulesetId],
  );

  const isLoading = composites === undefined || compositeVariants === undefined;
  useEffect(() => {
    useApiLoadingStore.getState().setLoading('composites', isLoading);
  }, [isLoading]);

  const variantsForComposite = useCallback(
    (compositeId: string) =>
      (compositeVariants ?? []).filter((v) => v.compositeId === compositeId),
    [compositeVariants],
  );

  const saveOrUpdateComposite = useCallback(
    async (rootComponentId: string, name: string) => {
      if (!rulesetId) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const now = new Date().toISOString();
      try {
        const existing = await db.composites.where('rootComponentId').equals(rootComponentId).first();
        if (existing) {
          await db.composites.update(existing.id, { name: trimmed, updatedAt: now });
        } else {
          await db.composites.add({
            id: crypto.randomUUID(),
            rulesetId,
            name: trimmed,
            rootComponentId,
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (e) {
        handleError(e as Error, {
          component: 'useComposites/saveOrUpdateComposite',
          severity: 'medium',
        });
      }
    },
    [handleError, rulesetId],
  );

  const removeComposite = useCallback(
    async (compositeId: string) => {
      try {
        await deleteCompositeCascade(compositeId);
      } catch (e) {
        handleError(e as Error, {
          component: 'useComposites/removeComposite',
          severity: 'medium',
        });
      }
    },
    [handleError],
  );

  const addVariant = useCallback(
    async (compositeId: string, variantName: string) => {
      if (!rulesetId) return;
      const trimmed = variantName.trim();
      if (!trimmed) return;
      const composite = await db.composites.get(compositeId);
      if (!composite) return;
      const defaultRoot = await db.components.get(composite.rootComponentId);
      if (!defaultRoot) return;

      const windowComps = await db.components.where('windowId').equals(defaultRoot.windowId).toArray();
      const now = new Date().toISOString();
      const dx = VARIANT_OFFSET_X;
      const newRoot = cloneComponentSubtreeForWindow({
        sourceRootId: composite.rootComponentId,
        windowComponents: windowComps,
        targetWindowId: defaultRoot.windowId,
        rulesetId,
        rootWorldX: defaultRoot.x + dx,
        rootWorldY: defaultRoot.y,
      });
      if (newRoot.length === 0) return;

      const groupRoot = newRoot.find((row) => !row.parentComponentId) ?? newRoot[0];
      if (!groupRoot) return;

      try {
        await db.components.bulkAdd(newRoot);
        const groupRootId = groupRoot.id;
        await db.compositeVariants.add({
          id: crypto.randomUUID(),
          rulesetId,
          compositeId,
          name: trimmed,
          groupComponentId: groupRootId,
          sortOrder: (await db.compositeVariants.where('compositeId').equals(compositeId).count()) + 1,
          createdAt: now,
          updatedAt: now,
        });
      } catch (e) {
        handleError(e as Error, {
          component: 'useComposites/addVariant',
          severity: 'medium',
        });
      }
    },
    [handleError, rulesetId],
  );

  const stampComposite = useCallback(
    async (params: {
      targetWindowId: string;
      compositeId: string;
      /** When set, stamp this variant’s subtree; otherwise the default root. */
      variantGroupRootId?: string | null;
      rootWorldX: number;
      rootWorldY: number;
    }) => {
      if (!rulesetId) return;
      const composite = await db.composites.get(params.compositeId);
      if (!composite) return;

      let sourceRootId = composite.rootComponentId;
      if (params.variantGroupRootId) {
        const variant = await db.compositeVariants
          .where('groupComponentId')
          .equals(params.variantGroupRootId)
          .first();
        if (variant && variant.compositeId === params.compositeId) {
          sourceRootId = variant.groupComponentId;
        }
      }

      const templateRoot = await db.components.get(sourceRootId);
      if (!templateRoot) return;

      const windowComps = await db.components
        .where('windowId')
        .equals(templateRoot.windowId)
        .toArray();

      const stamped = cloneComponentSubtreeForWindow({
        sourceRootId,
        windowComponents: windowComps,
        targetWindowId: params.targetWindowId,
        rulesetId,
        rootWorldX: params.rootWorldX,
        rootWorldY: params.rootWorldY,
      });
      if (stamped.length === 0) return;

      try {
        await db.components.bulkAdd(stamped);
      } catch (e) {
        handleError(e as Error, {
          component: 'useComposites/stampComposite',
          severity: 'medium',
        });
      }
    },
    [handleError, rulesetId],
  );

  return {
    composites: composites ?? [],
    compositeVariants: compositeVariants ?? [],
    isLoading,
    variantsForComposite,
    saveOrUpdateComposite,
    removeComposite,
    addVariant,
    stampComposite,
  };
}
