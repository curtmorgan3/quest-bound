import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { ScriptLog } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveRuleset } from '../rulesets/use-active-ruleset';

export const useScriptLogs = (limit = 100) => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();

  const logs = useLiveQuery(
    () =>
      db.scriptLogs
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .reverse()
        .limit(limit)
        .toArray(),
    [activeRuleset, limit],
  );

  const logScriptLog = async (data: Omit<ScriptLog, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      await db.scriptLogs.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
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
    if (!activeRuleset) return;
    try {
      await db.scriptLogs.where('rulesetId').equals(activeRuleset.id).delete();
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
