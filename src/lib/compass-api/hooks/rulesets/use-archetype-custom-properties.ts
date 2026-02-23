import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { ArchetypeCustomProperty, CustomProperty } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useArchetypeCustomProperties = (archetypeId: string | undefined) => {
  const { handleError } = useErrorHandler();

  const archetypeCustomProperties: ArchetypeCustomProperty[] =
    useLiveQuery(
      () =>
        archetypeId
          ? db.archetypeCustomProperties
              .where('archetypeId')
              .equals(archetypeId)
              .toArray()
          : Promise.resolve([] as ArchetypeCustomProperty[]),
      [archetypeId],
    ) ?? [];

  const customProperties: CustomProperty[] = useLiveQuery(
    async () => {
      if (!archetypeId || archetypeCustomProperties.length === 0) return [];
      const cps = await Promise.all(
        archetypeCustomProperties.map((acp) =>
          db.customProperties.get(acp.customPropertyId),
        ),
      );
      return cps.filter((cp): cp is CustomProperty => cp != null);
    },
    [archetypeId, archetypeCustomProperties],
  ) ?? [];

  const addArchetypeCustomProperty = async (customPropertyId: string) => {
    if (!archetypeId) return;
    const now = new Date().toISOString();
    try {
      const existing = await db.archetypeCustomProperties
        .where('[archetypeId+customPropertyId]')
        .equals([archetypeId, customPropertyId])
        .first();
      if (existing) return;

      await db.archetypeCustomProperties.add({
        id: crypto.randomUUID(),
        archetypeId,
        customPropertyId,
        createdAt: now,
        updatedAt: now,
      } as ArchetypeCustomProperty);
    } catch (e) {
      handleError(e as Error, {
        component: 'useArchetypeCustomProperties/addArchetypeCustomProperty',
        severity: 'medium',
      });
    }
  };

  const removeArchetypeCustomProperty = async (id: string) => {
    try {
      await db.archetypeCustomProperties.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useArchetypeCustomProperties/removeArchetypeCustomProperty',
        severity: 'medium',
      });
    }
  };

  const updateArchetypeCustomProperty = async (
    id: string,
    updates: Partial<Pick<ArchetypeCustomProperty, 'defaultValue'>>,
  ) => {
    try {
      const updatedAt = new Date().toISOString();
      if ('defaultValue' in updates && updates.defaultValue === undefined) {
        await db.archetypeCustomProperties
          .where('id')
          .equals(id)
          .modify((record) => {
            delete (record as Record<string, unknown>).defaultValue;
            record.updatedAt = updatedAt;
          });
      } else {
        await db.archetypeCustomProperties.update(id, {
          ...updates,
          updatedAt,
        });
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'useArchetypeCustomProperties/updateArchetypeCustomProperty',
        severity: 'medium',
      });
    }
  };

  return {
    archetypeCustomProperties,
    customProperties,
    addArchetypeCustomProperty,
    removeArchetypeCustomProperty,
    updateArchetypeCustomProperty,
  };
};
