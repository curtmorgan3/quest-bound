/**
 * When the user navigates to a ruleset (rulesetId in URL), set current ruleset for visibility
 * sync and trigger sync if the ruleset is cloud-synced.
 */

import { db } from '@/stores';
import type { DB } from '@/stores/db/hooks/types';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSyncStateStore } from './sync-state';
import { syncRuleset } from './sync-service';

export function useSyncOnRulesetOpen(): void {
  const { rulesetId } = useParams<{ rulesetId?: string }>();
  const { setCurrentRulesetId, loadSyncedRulesetIds } = useSyncStateStore();
  const didSyncRef = useRef<string | null>(null);

  useEffect(() => {
    loadSyncedRulesetIds();
  }, [loadSyncedRulesetIds]);

  useEffect(() => {
    if (!rulesetId) {
      setCurrentRulesetId(null);
      didSyncRef.current = null;
      return;
    }
    setCurrentRulesetId(rulesetId);
    const synced = useSyncStateStore.getState().isCloudSynced(rulesetId);
    if (!synced) return;
    if (didSyncRef.current === rulesetId) return;
    didSyncRef.current = rulesetId;
    syncRuleset(rulesetId, db as DB).then(() => {
      didSyncRef.current = null;
    });
  }, [rulesetId, setCurrentRulesetId]);
}
