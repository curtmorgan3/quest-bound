/**
 * In-memory custom event bus for QBScript `on` / `emit`.
 * Scoped by rulesetId; cleared when the app switches active ruleset (see syncRulesetContextFromApplication).
 */

export interface CustomEventListenerRecord {
  rulesetId: string;
  scriptId: string;
  ownerId: string | null;
  blockSource: string;
  capturedCharacterIds?: Record<string, string>;
  capturedValues?: Record<string, string | number | boolean | null>;
}

const listeners = new Map<string, Map<string, CustomEventListenerRecord[]>>();

/** Last ruleset id seen from navigation or outermost ScriptRunner.run (for clearing on switch). */
let lastApplicationRulesetId: string | null = null;

const emitDepthByKey = new Map<string, number>();

const pendingMainThreadEmits: Array<{
  rulesetId: string;
  eventName: string;
  payload: unknown;
}> = [];

let scriptRunDepth = 0;

/** Clears all in-memory state (for unit tests only). */
export function resetCustomEventRegistryForTests(): void {
  listeners.clear();
  lastApplicationRulesetId = null;
  emitDepthByKey.clear();
  pendingMainThreadEmits.length = 0;
  scriptRunDepth = 0;
}

function listenerMapKey(rulesetId: string, eventName: string): string {
  return `${rulesetId}\0${eventName}`;
}

/**
 * Call when the SPA active ruleset changes or when starting an outermost script run with a rulesetId.
 * Drops listeners for the previous ruleset when the id changes.
 */
export function syncRulesetContextFromApplication(nextRulesetId: string | null): void {
  if (nextRulesetId === null || nextRulesetId === '') {
    if (lastApplicationRulesetId !== null) {
      listeners.delete(lastApplicationRulesetId);
    }
    lastApplicationRulesetId = null;
    return;
  }
  if (lastApplicationRulesetId !== null && lastApplicationRulesetId !== nextRulesetId) {
    listeners.delete(lastApplicationRulesetId);
  }
  lastApplicationRulesetId = nextRulesetId;
}

/**
 * Register or replace the listener for this (rulesetId, eventName, scriptId).
 * At most one callback per script per event name; re-running the same script updates the handler.
 */
export function registerCustomEventListener(
  rulesetId: string,
  eventName: string,
  record: CustomEventListenerRecord,
): void {
  if (!rulesetId || !eventName) return;
  let byEvent = listeners.get(rulesetId);
  if (!byEvent) {
    byEvent = new Map();
    listeners.set(rulesetId, byEvent);
  }
  const list = byEvent.get(eventName) ?? [];
  const scriptKey = record.scriptId ?? '';
  const next = list.filter((r) => (r.scriptId ?? '') !== scriptKey);
  next.push(record);
  byEvent.set(eventName, next);
}

export function getCustomEventListeners(
  rulesetId: string,
  eventName: string,
): CustomEventListenerRecord[] {
  return listeners.get(rulesetId)?.get(eventName) ?? [];
}

export class CustomEventReentrantEmitError extends Error {
  constructor(eventName: string) {
    super(`Recursive emit('${eventName}') is not allowed`);
    this.name = 'CustomEventReentrantEmitError';
  }
}

export function beginCustomEventDispatch(rulesetId: string, eventName: string): void {
  const key = listenerMapKey(rulesetId, eventName);
  const d = emitDepthByKey.get(key) ?? 0;
  if (d > 0) {
    throw new CustomEventReentrantEmitError(eventName);
  }
  emitDepthByKey.set(key, d + 1);
}

export function endCustomEventDispatch(rulesetId: string, eventName: string): void {
  const key = listenerMapKey(rulesetId, eventName);
  const d = (emitDepthByKey.get(key) ?? 1) - 1;
  if (d <= 0) {
    emitDepthByKey.delete(key);
  } else {
    emitDepthByKey.set(key, d);
  }
}

export function getCustomEventScriptRunDepth(): number {
  return scriptRunDepth;
}

export function beginCustomEventScriptRun(): void {
  scriptRunDepth++;
}

export async function endCustomEventScriptRun(flushQueued: () => Promise<void>): Promise<void> {
  scriptRunDepth = Math.max(0, scriptRunDepth - 1);
  if (scriptRunDepth === 0) {
    await flushQueued();
  }
}

export function shouldQueueMainThreadCustomEventEmit(): boolean {
  return scriptRunDepth > 0;
}

export function enqueueMainThreadCustomEvent(
  rulesetId: string,
  eventName: string,
  payload: unknown,
): void {
  pendingMainThreadEmits.push({ rulesetId, eventName, payload });
}

export function drainMainThreadCustomEventQueue(): Array<{
  rulesetId: string;
  eventName: string;
  payload: unknown;
}> {
  const out = [...pendingMainThreadEmits];
  pendingMainThreadEmits.length = 0;
  return out;
}
