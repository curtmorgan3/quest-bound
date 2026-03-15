/**
 * Sync service: pull and push for a ruleset.
 * Step 6 will add syncRuleset orchestrator (pull → push) and triggers.
 */

import type { DB } from '@/stores/db/hooks/types';
import { syncPull } from './sync-pull';
import { syncPush } from './sync-push';

export { syncPull, syncPush };

export async function syncRuleset(rulesetId: string, db: DB): Promise<{ error?: string }> {
  const pullResult = await syncPull(rulesetId, db);
  if (pullResult.error) return pullResult;
  return syncPush(rulesetId, db);
}
