/**
 * Cloud `rulesets.user_id` for a ruleset (creator / row owner). RLS restricts the query to
 * rulesets the session may access (owned or org-linked). Used for pull/push queries and storage prefix fallback.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchCloudRulesetRowOwnerId(
  client: SupabaseClient,
  rulesetId: string,
): Promise<string> {
  const { data, error } = await client.from('rulesets').select('user_id').eq('id', rulesetId).maybeSingle();

  if (error) throw error;
  const uid = data?.user_id;
  if (typeof uid !== 'string' || uid.length === 0) {
    throw new Error('Ruleset not found in the cloud or you do not have access');
  }
  return uid;
}
