import type { World } from '@/types';

/** Worlds feature removed; stub always returns undefined. */
export const useWorld = (_worldId: string | undefined): World | undefined => {
  return undefined;
};
