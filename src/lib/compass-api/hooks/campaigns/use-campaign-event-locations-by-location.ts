import type { CampaignEvent } from '@/types';

/** Campaign event locations (world/location maps) removed; stub returns empty array. */
export type EventLocationWithEvent = {
  id: string;
  campaignEventId: string;
  locationId: string;
  tileId?: string | null;
  event: CampaignEvent;
};

export const useCampaignEventLocationsByLocation = (
  _locationId: string | undefined,
): EventLocationWithEvent[] => {
  return [];
};
