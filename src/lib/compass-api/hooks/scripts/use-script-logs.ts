import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { ScriptLog } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveRuleset } from '../rulesets/use-active-ruleset';

/**
 * @param limit Max number of log entries to return (newest first). When campaignId is set, no limit is applied (show all campaign logs).
 * @param rulesetId Optional. When set (e.g. campaign's rulesetId), query logs for this ruleset instead of active ruleset.
 * @param campaignId Optional. When set (e.g. campaign log), query and clear logs by campaign instead of ruleset.
 */
export const useScriptLogs = (limit = 100, rulesetId?: string, campaignId?: string) => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();
  const effectiveRulesetId = rulesetId ?? activeRuleset?.id;

  const logs = useLiveQuery(
    async (): Promise<ScriptLog[]> => {
      if (campaignId) {
        return db.scriptLogs
          .where('campaignId')
          .equals(campaignId)
          .reverse()
          .toArray();
      }
      if (effectiveRulesetId) {
        return db.scriptLogs
          .where('rulesetId')
          .equals(effectiveRulesetId)
          .reverse()
          .limit(limit)
          .toArray();
      }
      return [];
    },
    [effectiveRulesetId, limit, campaignId],
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
        campaignId: data.campaignId ?? campaignId ?? null,
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
    try {
      if (campaignId) {
        await db.scriptLogs.where('campaignId').equals(campaignId).delete();
      } else if (effectiveRulesetId) {
        await db.scriptLogs.where('rulesetId').equals(effectiveRulesetId).delete();
      }
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
