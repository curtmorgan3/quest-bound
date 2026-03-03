import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { ScriptLog } from '@/types';
import {
  getGameLogResetAt,
  setGameLogResetAt,
} from '@/utils/game-log-reset-storage';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useState } from 'react';
import { useActiveRuleset } from '../rulesets/use-active-ruleset';

/**
 * When characterId is set and campaignId is not, we're in "game log" mode: clear sets a
 * reset timestamp (no delete); only logs with timestamp > resetAt are shown, capped at limit.
 */
function useGameLogResetAt(
  rulesetId: string | undefined,
  characterId: string | undefined,
): [number | null | undefined, (resetAt: number) => Promise<void>] {
  const [resetAt, setResetAt] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!rulesetId || !characterId) {
      setResetAt(undefined);
      return;
    }
    let cancelled = false;
    getGameLogResetAt(rulesetId, characterId).then((value) => {
      if (!cancelled) setResetAt(value);
    });
    return () => {
      cancelled = true;
    };
  }, [rulesetId, characterId]);

  const setReset = useCallback(
    async (ts: number) => {
      if (!rulesetId || !characterId) return;
      await setGameLogResetAt(rulesetId, characterId, ts);
      setResetAt(ts);
    },
    [rulesetId, characterId],
  );

  return [resetAt, setReset];
}

/**
 * @param limit Max number of log entries to return (newest first). When campaignId is set, no limit is applied (show all campaign logs).
 * @param rulesetId Optional. When set (e.g. campaign's rulesetId), query logs for this ruleset instead of active ruleset.
 * @param campaignId Optional. When set (e.g. campaign log), query and clear logs by campaign instead of ruleset.
 * @param characterId Optional. When set and campaignId is not (game log on character page), clear only resets the view for this character (no delete); only logs after the last reset are shown.
 */
export const useScriptLogs = (
  limit = 100,
  rulesetId?: string,
  campaignId?: string,
  characterId?: string,
) => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();
  const effectiveRulesetId = rulesetId ?? activeRuleset?.id;
  const [gameLogResetAt, setGameLogResetAt] = useGameLogResetAt(
    characterId && !campaignId ? effectiveRulesetId : undefined,
    characterId,
  );

  const isGameLogMode = Boolean(characterId && !campaignId);

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
        if (isGameLogMode) {
          if (gameLogResetAt === undefined) return [];
          const minTimestamp = gameLogResetAt ?? 0;
          const raw = await db.scriptLogs
            .where('rulesetId')
            .equals(effectiveRulesetId)
            .reverse()
            .limit(limit * 3)
            .toArray();
          return raw
            .filter((log) => log.timestamp > minTimestamp)
            .slice(0, limit);
        }
        return db.scriptLogs
          .where('rulesetId')
          .equals(effectiveRulesetId)
          .reverse()
          .limit(limit)
          .toArray();
      }
      return [];
    },
    [effectiveRulesetId, limit, campaignId, isGameLogMode, gameLogResetAt],
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
      } else if (isGameLogMode && effectiveRulesetId && characterId) {
        await setGameLogResetAt(Date.now());
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
