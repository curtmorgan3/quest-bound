import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { ScriptLog } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveRuleset } from '../rulesets/use-active-ruleset';

/**
 * @param limit Max number of log entries to return (newest first).
 * @param rulesetId Optional. When set (e.g. campaign's rulesetId), query logs for this ruleset instead of active ruleset.
 */
export const useScriptLogs = (limit = 100, rulesetId?: string) => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();
  const effectiveRulesetId = rulesetId ?? activeRuleset?.id;

  const logs = useLiveQuery(
    async (): Promise<ScriptLog[]> =>
      effectiveRulesetId
        ? db.scriptLogs
            .where('rulesetId')
            .equals(effectiveRulesetId)
            .reverse()
            .limit(limit)
            .toArray()
        : [],
    [effectiveRulesetId, limit],
  );

  const logScriptLog = async (data: Omit<ScriptLog, 'id' | 'createdAt' | 'updatedAt'>) => {
    const targetRulesetId = rulesetId ?? activeRuleset?.id;
    if (!targetRulesetId) return;
    const now = new Date().toISOString();
    try {
      await db.scriptLogs.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: targetRulesetId,
        createdAt: now,
        updatedAt: now,
        timestamp: data.timestamp ?? Date.now(),
      } as ScriptLog);
    } catch (e) {
      handleError(e as Error, {
        component: 'useScriptLogs/logScriptLog',
        severity: 'low',
      });
    }
  };

  const clearLogs = async () => {
    if (!effectiveRulesetId) return;
    try {
      await db.scriptLogs.where('rulesetId').equals(effectiveRulesetId).delete();
    } catch (e) {
      handleError(e as Error, {
        component: 'useScriptLogs/clearLogs',
        severity: 'low',
      });
    }
  };

  const deleteLog = async (id: string) => {
    try {
      await db.scriptLogs.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useScriptLogs/deleteLog',
        severity: 'low',
      });
    }
  };

  return {
    logs: logs ?? [],
    logScriptLog,
    clearLogs,
    deleteLog,
  };
};
