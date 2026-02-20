import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Location } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useLocations = (worldId: string | undefined) => {
  const { handleError } = useErrorHandler();

  const locations = useLiveQuery(
    () =>
      worldId
        ? db.locations.where('worldId').equals(worldId).toArray()
        : Promise.resolve([] as Location[]),
    [worldId],
  );

  const createLocation = async (worldId: string, data: Partial<Location>) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.locations.add({
        ...data,
        id,
        worldId,
        label: data.label ?? 'New Location',
        nodeX: data.nodeX ?? 0,
        nodeY: data.nodeY ?? 0,
        nodeWidth: data.nodeWidth ?? 1,
        nodeHeight: data.nodeHeight ?? 1,
        gridWidth: data.gridWidth ?? 1,
        gridHeight: data.gridHeight ?? 1,
        tiles: data.tiles ?? [],
        createdAt: now,
        updatedAt: now,
      } as Location);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useLocations/createLocation',
        severity: 'medium',
      });
    }
  };

  const updateLocation = async (id: string, data: Partial<Location>) => {
    const now = new Date().toISOString();
    try {
      await db.locations.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useLocations/updateLocation',
        severity: 'medium',
      });
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const locationItems = await db.locationItems.where('locationId').equals(id).toArray();
      await db.locationItems.bulkDelete(locationItems.map((li) => li.id));
      await db.locations.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useLocations/deleteLocation',
        severity: 'medium',
      });
    }
  };

  return {
    locations: locations ?? [],
    createLocation,
    updateLocation,
    deleteLocation,
  };
};
