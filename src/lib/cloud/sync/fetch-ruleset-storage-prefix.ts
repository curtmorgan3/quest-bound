/**
 * Resolves the storage folder prefix for a ruleset's assets/fonts (Phase 2 collab).
 * Org-linked: `{organization_id}/{rulesetId}` — otherwise `{rowOwnerUserId}/{rulesetId}`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * @param rowOwnerUserId - Cloud `user_id` on synced rows (typically the session user; later the ruleset owner for org-member pushes).
 * @param rulesetId - Ruleset primary id in Dexie / cloud `rulesets.id`
 */
export async function fetchRulesetStorageFolderPrefix(
  client: SupabaseClient,
  rowOwnerUserId: string,
  rulesetId: string,
): Promise<string> {
  const { data, error } = await client
    .from('organization_rulesets')
    .select('organization_id')
    .eq('ruleset_id', rulesetId)
    .maybeSingle();

  if (error) throw error;

  const orgId = data?.organization_id;
  if (typeof orgId === 'string' && orgId.length > 0) {
    return `${orgId}/${rulesetId}`;
  }

  return `${rowOwnerUserId}/${rulesetId}`;
}
