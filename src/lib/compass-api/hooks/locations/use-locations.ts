import type { Location } from '@/types';

/** Locations feature removed; stub returns empty data and no-op mutations. */
export const useAllLocations = (_worldId: string | undefined): Location[] => {
  return [];
};

export const useLocations = (
  _worldId: string | undefined,
  _parentLocationId: string | null = null,
) => {
  return {
    locations: [] as Location[],
    createLocation: async (_worldId: string, _data: Partial<Location>) =>
      undefined as string | undefined,
    updateLocation: async (_id: string, _data: Partial<Location>) => {},
    deleteLocation: async (_id: string) => {},
  };
};
