import {
  generateCampaignJoinToken,
  parseJoinTokenOrUrl,
} from '@/lib/campaign-play/join/generate-join-token';
import { describe, expect, it } from 'vitest';

describe('generateCampaignJoinToken', () => {
  it('produces a URL-safe string with enough entropy', () => {
    const a = generateCampaignJoinToken();
    const b = generateCampaignJoinToken();
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(a).not.toEqual(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('parseJoinTokenOrUrl', () => {
  it('extracts token from query string', () => {
    expect(parseJoinTokenOrUrl('https://x.com/#/join/rs?token=abc%2B')).toBe('abc+');
  });

  it('returns trimmed raw token when no query match', () => {
    expect(parseJoinTokenOrUrl('  rawtok  ')).toBe('rawtok');
  });
});
