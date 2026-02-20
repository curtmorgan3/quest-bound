import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { LocationItem } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useLocationItems = (worldId?: string, locationId?: string) => {
  const { handleError } = useErrorHandler();

  const locationItems = useLiveQuery(
    async () => {
      if (!worldId) return [];
      let collection = db.locationItems.where('worldId').equals(worldId);
      if (locationId) {
        const all = await collection.toArray();
        return all.filter((li) => li.locationId === locationId);
      }
      return collection.toArray();
    },
    [worldId, locationId],
  );

  const createLocationItem = async (
    worldId: string,
    locationId: string,
    data: Partial<LocationItem>,
  ) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.locationItems.add({
        ...data,
        id,
        worldId,
        locationId,
        itemId: data.itemId ?? '',
        rulesetId: data.rulesetId ?? '',
        tileId: data.tileId ?? '',
        sprites: data.sprites,
        createdAt: now,
        updatedAt: now,
      } as LocationItem);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useLocationItems/createLocationItem',
        severity: 'medium',
      });
    }
  };

  const updateLocationItem = async (id: string, data: Partial<LocationItem>) => {
    const now = new Date().toISOString();
    try {
      await db.locationItems.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useLocationItems/updateLocationItem',
        severity: 'medium',
      });
    }
  };

  const deleteLocationItem = async (id: string) => {
    try {
      await db.locationItems.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useLocationItems/deleteLocationItem',
        severity: 'medium',
      });
    }
  };

  return {
    locationItems: locationItems ?? [],
    createLocationItem,
    updateLocationItem,
    deleteLocationItem,
  };
};
