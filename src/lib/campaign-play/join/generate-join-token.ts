/**
 * URL-safe token, ≥128 bits (16 bytes), for campaign join links (Phase 2.6).
 */
export function generateCampaignJoinToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Accepts a raw token or a full URL/query that contains `token=`. */
export function parseJoinTokenOrUrl(input: string): string {
  const t = input.trim();
  const m = t.match(/[?&#]token=([^&]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]!);
    } catch {
      return m[1]!.trim();
    }
  }
  return t;
}

export function buildCampaignJoinUrl(rulesetId: string, joinToken: string): string {
  const { origin, pathname } = window.location;
  const base = `${origin}${pathname}`;
  const encRuleset = encodeURIComponent(rulesetId);
  const encToken = encodeURIComponent(joinToken);
  return `${base}#/join/${encRuleset}?token=${encToken}`;
}
