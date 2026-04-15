import {
  shouldBlockClientCampaignScript,
  type CampaignPlayScriptWorkerPolicy,
} from '@/lib/campaign-play/campaign-play-script-gate';
import { describe, expect, it } from 'vitest';

const clientPolicy = (campaignId: string): CampaignPlayScriptWorkerPolicy => ({
  featureEnabled: true,
  role: 'client',
  sessionCampaignId: campaignId,
});

describe('shouldBlockClientCampaignScript', () => {
  it('does not block when the feature is off', () => {
    expect(
      shouldBlockClientCampaignScript(
        { featureEnabled: false, role: 'client', sessionCampaignId: 'c1' },
        'c1',
      ),
    ).toBe(false);
  });

  it('does not block for host role', () => {
    expect(
      shouldBlockClientCampaignScript(
        { featureEnabled: true, role: 'host', sessionCampaignId: 'c1' },
        'c1',
      ),
    ).toBe(false);
  });

  it('does not block when campaign id is missing on the request', () => {
    expect(shouldBlockClientCampaignScript(clientPolicy('c1'), undefined)).toBe(false);
    expect(shouldBlockClientCampaignScript(clientPolicy('c1'), '')).toBe(false);
  });

  it('does not block when session campaign differs from script campaign', () => {
    expect(shouldBlockClientCampaignScript(clientPolicy('c1'), 'c2')).toBe(false);
  });

  it('blocks client when feature is on, roles match, and campaign ids match', () => {
    expect(shouldBlockClientCampaignScript(clientPolicy('camp-uuid'), 'camp-uuid')).toBe(true);
  });

  it('does not block when there is no active session id', () => {
    expect(
      shouldBlockClientCampaignScript(
        { featureEnabled: true, role: 'client', sessionCampaignId: null },
        'c1',
      ),
    ).toBe(false);
  });
});
