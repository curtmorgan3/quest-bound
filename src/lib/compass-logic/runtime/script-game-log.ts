/**
 * Ordered transcript of script `log()` calls and roll summaries for a single run.
 * Used so the game log can persist one batch with correct interleaving.
 */
export type ScriptGameLogEntry =
  | { kind: 'log'; args: any[] }
  | { kind: 'roll'; message: string };

export function logMessagesToGameLogTimeline(logMessages: any[][]): ScriptGameLogEntry[] {
  return logMessages.map((args) => ({ kind: 'log', args }));
}
