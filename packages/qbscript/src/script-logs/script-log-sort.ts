import type { ScriptLog } from '@quest-bound/types';

/**
 * Newest-first ordering for the game log. Within the same `timestamp`, higher `sequence`
 * sorts first (later log() calls and the trailing auto-generated entry).
 */
export function compareScriptLogsNewestFirst(a: ScriptLog, b: ScriptLog): number {
  const t = b.timestamp - a.timestamp;
  if (t !== 0) return t;
  return (b.sequence ?? 0) - (a.sequence ?? 0);
}
