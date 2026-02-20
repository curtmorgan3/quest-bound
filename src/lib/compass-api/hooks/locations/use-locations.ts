import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Location } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

const DEFAULT_GRID_SIZE = 8;

/** Pass null for world root; pass a location id to get its children. */
export const useLocations = (
  worldId: string | undefined,
  parentLocationId: string | null = null,
) => {
  const { handleError } = useErrorHandler();

  const locations = useLiveQuery(async () => {
    if (!worldId) return [] as Location[];
    const all = await db.locations.where('worldId').equals(worldId).toArray();
    if (parentLocationId === null) {
      return all.filter((loc) => loc.parentLocationId == null);
    }
    return all.filter((loc) => loc.parentLocationId === parentLocationId);
  }, [worldId, parentLocationId]);

  const createLocation = async (worldId: string, data: Partial<Location>) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.locations.add({
        ...data,
        id,
        worldId,
        parentLocationId: data.parentLocationId ?? null,
        label: data.label ?? 'New Location',
        nodeX: data.nodeX ?? 0,
        nodeY: data.nodeY ?? 0,
        nodeWidth: data.nodeWidth ?? 1,
        nodeHeight: data.nodeHeight ?? 1,
        gridWidth: data.gridWidth ?? DEFAULT_GRID_SIZE,
        gridHeight: data.gridHeight ?? DEFAULT_GRID_SIZE,
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
