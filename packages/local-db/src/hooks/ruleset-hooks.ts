import { getSyncState } from '@/lib/cloud/sync/sync-state';
import { ensureRulesetDefaultTestCharacterAndArchetype } from '@/utils/ensure-ruleset-default-bootstrap';
import type { DB } from './types';

export function registerRulesetDbHooks(db: DB) {
  // Create test character and default archetype when a ruleset is created
  db.rulesets.hook('creating', (_primKey, obj) => {
    if (getSyncState().isSyncing) return;
    setTimeout(async () => {
      try {
        await ensureRulesetDefaultTestCharacterAndArchetype(
          obj.id,
          obj.createdBy ?? 'unknown',
        );
      } catch (error) {
        console.error('Failed to create test character and default archetype for ruleset:', error);
      }
    }, 0);
  });

}
