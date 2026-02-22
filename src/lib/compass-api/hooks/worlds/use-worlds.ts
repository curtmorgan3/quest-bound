import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { World } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useWorlds = () => {
  const { handleError } = useErrorHandler();

  const worlds = useLiveQuery(() => db.worlds.toArray(), []);

  const createWorld = async (data: Partial<World>) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.worlds.add({
        ...data,
        id,
        label: data.label ?? 'New World',
        description: data.description,
        assetId: data.assetId ?? null,
        image: data.image ?? null,
        createdAt: now,
        updatedAt: now,
      } as World);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useWorlds/createWorld',
        severity: 'medium',
      });
    }
  };

  const updateWorld = async (id: string, data: Partial<World>) => {
    const now = new Date().toISOString();
    try {
      await db.worlds.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useWorlds/updateWorld',
        severity: 'medium',
      });
    }
  };

  const deleteWorld = async (id: string) => {
    try {
      const world = await db.worlds.get(id);
      if (!world) return;

      // Cascade: campaigns for this world
      const campaigns = await db.campaigns.where('worldId').equals(id).toArray();
      for (const c of campaigns) {
        await db.campaignCharacters.where('campaignId').equals(c.id).delete();
        await db.campaignItems.where('campaignId').equals(c.id).delete();
        const events = await db.campaignEvents.where('campaignId').equals(c.id).toArray();
        for (const e of events) {
          await db.campaignEventLocations.where('campaignEventId').equals(e.id).delete();
        }
        await db.campaignEvents.where('campaignId').equals(c.id).delete();
        await db.campaigns.delete(c.id);
      }

      // Locations for this world
      const locations = await db.locations.where('worldId').equals(id).toArray();
      await db.locations.bulkDelete(locations.map((l) => l.id));

      // Tiles for tilemaps of this world, then tilemaps
      const tilemaps = await db.tilemaps.where('worldId').equals(id).toArray();
      for (const tm of tilemaps) {
        const tiles = await db.tiles.where('tilemapId').equals(tm.id).toArray();
        await db.tiles.bulkDelete(tiles.map((t) => t.id));
      }
      await db.tilemaps.bulkDelete(tilemaps.map((tm) => tm.id));

      await db.worlds.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useWorlds/deleteWorld',
        severity: 'medium',
      });
    }
  };

  return {
    worlds: worlds ?? [],
    createWorld,
    updateWorld,
    deleteWorld,
  };
};
