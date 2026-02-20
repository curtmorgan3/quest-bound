import { db } from '@/stores';
import type { CampaignEvent, CampaignEventLocation } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export type EventLocationWithEvent = CampaignEventLocation & { event: CampaignEvent };

/**
 * Returns all campaign event locations for a given location (and optionally tile),
 * with the resolved CampaignEvent. Used by campaign editor and play to show
 * events at a location and highlight tiles.
 */
export const useCampaignEventLocationsByLocation = (locationId: string | undefined) => {
  const result = useLiveQuery(
    async (): Promise<EventLocationWithEvent[]> => {
      if (!locationId) return [];
      const eventLocs = await db.campaignEventLocations
        .where('locationId')
        .equals(locationId)
        .toArray();
      if (eventLocs.length === 0) return [];
      const events = await db.campaignEvents.bulkGet(
        eventLocs.map((el) => el.campaignEventId),
      );
      return eventLocs
        .map((el) => {
          const event = events.find((e) => e?.id === el.campaignEventId);
          return event ? ({ ...el, event } as EventLocationWithEvent) : null;
        })
        .filter((x): x is EventLocationWithEvent => x != null);
    },
    [locationId],
  );
  return result ?? [];
};
