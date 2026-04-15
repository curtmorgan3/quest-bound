import { getCampaignPlayBroadcastTopic } from '@/lib/campaign-play/realtime/campaign-channel-name';
import { describe, expect, it } from 'vitest';

describe('getCampaignPlayBroadcastTopic', () => {
  it('is stable and includes campaign id', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(getCampaignPlayBroadcastTopic(id)).toBe(`campaign-play:${id}`);
  });
});
