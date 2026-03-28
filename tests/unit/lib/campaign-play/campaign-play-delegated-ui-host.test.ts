import { describe, expect, it, beforeEach } from 'vitest';
import {
  __registerPendingDelegatedForTest,
  __resetDelegatedUiHostStateForTests,
  handleCampaignPlayDelegatedUiResponse,
} from '@/lib/campaign-play/realtime/campaign-play-delegated-ui-host';
import { CAMPAIGN_REALTIME_PROTOCOL_VERSION } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';

describe('campaign-play-delegated-ui-host', () => {
  beforeEach(() => {
    __resetDelegatedUiHostStateForTests();
  });

  it('consumes token once; wrong token or duplicate is ignored', async () => {
    const values: unknown[] = [];
    const errors: Error[] = [];

    __registerPendingDelegatedForTest({
      executionRequestId: 'exec-1',
      interactionId: 'int-1',
      responseToken: 'tok-a',
      resolve: (v) => values.push(v),
      reject: (e) => errors.push(e),
    });

    handleCampaignPlayDelegatedUiResponse({
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'delegated_ui_response',
      campaignId: 'c1',
      executionRequestId: 'exec-1',
      interactionId: 'int-1',
      responseToken: 'wrong',
      result: 1,
    });
    expect(values).toHaveLength(0);

    handleCampaignPlayDelegatedUiResponse({
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'delegated_ui_response',
      campaignId: 'c1',
      executionRequestId: 'exec-1',
      interactionId: 'int-1',
      responseToken: 'tok-a',
      result: 7,
    });
    expect(values).toEqual([7]);

    handleCampaignPlayDelegatedUiResponse({
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'delegated_ui_response',
      campaignId: 'c1',
      executionRequestId: 'exec-1',
      interactionId: 'int-1',
      responseToken: 'tok-a',
      result: 99,
    });
    expect(values).toEqual([7]);
    expect(errors).toHaveLength(0);
  });
});
