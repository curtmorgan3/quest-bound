import type { World } from '@/types';

/** Worlds feature removed; stub returns empty data and no-op mutations. */
export const useWorlds = () => {
  return {
    worlds: [] as World[],
    createWorld: async (_data: Partial<World>) => undefined as string | undefined,
    updateWorld: async (_id: string, _data: Partial<World>) => {},
    deleteWorld: async (_id: string) => {},
  };
};
