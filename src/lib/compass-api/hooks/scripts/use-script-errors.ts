import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { ScriptError } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveRuleset } from '../rulesets/use-active-ruleset';

export const useScriptErrors = (limit = 100) => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();

  const errors = useLiveQuery(
    () =>
      db.scriptErrors
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .reverse()
        .limit(limit)
        .toArray(),
    [activeRuleset, limit],
  );

  const logScriptError = async (data: Omit<ScriptError, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      await db.scriptErrors.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
        timestamp: Date.now(),
      } as ScriptError);
    } catch (e) {
      handleError(e as Error, {
        component: 'useScriptErrors/logScriptError',
        severity: 'low',
      });
    }
  };

  const clearErrors = async () => {
    if (!activeRuleset) return;
    try {
      await db.scriptErrors
        .where('rulesetId')
        .equals(activeRuleset.id)
        .delete();
    } catch (e) {
      handleError(e as Error, {
        component: 'useScriptErrors/clearErrors',
        severity: 'low',
      });
    }
  };

  const dismissError = async (id: string) => {
    try {
      await db.scriptErrors.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useScriptErrors/dismissError',
        severity: 'low',
      });
    }
  };

  return {
    errors: errors ?? [],
    logScriptError,
    clearErrors,
    dismissError,
  };
};
