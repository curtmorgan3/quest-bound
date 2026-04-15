import { db } from '@/stores';
import type { Campaign } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useCampaign = (campaignId: string | undefined) => {
  const campaign = useLiveQuery(
    () =>
      campaignId ? db.campaigns.get(campaignId) : Promise.resolve(undefined),
    [campaignId],
  );

  return campaign as Campaign | undefined;
};
