/** Campaign event locations (world/location maps) removed; stub returns empty data and no-op mutations. */
export const useCampaignEventLocations = (_campaignEventId: string | undefined) => {
  return {
    campaignEventLocations: [] as { id: string; campaignEventId: string; locationId: string; tileId?: string | null }[],
    createCampaignEventLocation: async (
      _campaignEventId: string,
      _locationId: string,
      _tileId?: string | null,
    ) => undefined as string | undefined,
    deleteCampaignEventLocation: async (_id: string) => {},
    updateCampaignEventLocation: async (
      _id: string,
      _updates: { locationId?: string; tileId?: string | null },
    ) => {},
  };
};
