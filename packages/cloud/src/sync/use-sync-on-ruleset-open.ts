/**
 * When the user navigates to a ruleset (rulesetId in URL), set current ruleset and ensure
 * synced ruleset IDs are loaded. Sync is UI-driven only (e.g. "Sync Now" button).
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSyncStateStore } from './sync-state';

export function useSyncOnRulesetOpen(): void {
  const { rulesetId } = useParams<{ rulesetId?: string }>();
  const { setCurrentRulesetId, loadSyncedRulesetIds } = useSyncStateStore();

  useEffect(() => {
    loadSyncedRulesetIds();
  }, [loadSyncedRulesetIds]);

  useEffect(() => {
    setCurrentRulesetId(rulesetId ?? null);
  }, [rulesetId, setCurrentRulesetId]);
}
