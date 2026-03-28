import {
  getCampaignPlaySender,
  subscribeCampaignPlayEnvelopes,
} from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import type {
  CampaignRealtimeDelegatedUiRequestEnvelopeV1,
  CampaignRealtimeDelegatedUiResponseEnvelopeV1,
  CampaignRealtimeEnvelopeV1,
  DelegatedUiRequestBodyV1,
} from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { CAMPAIGN_REALTIME_PROTOCOL_VERSION } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { db } from '@/stores';

/**
 * Options when the host runs a joiner-originated script and must delegate blocking UI.
 * Trust: only clients subscribed to the private campaign channel see payloads; RLS applies to
 * Postgres-backed data, not to broadcast message bodies (see joiner-rolls.md §3).
 */
export interface CampaignPlayDelegatedUiHostRunOptions {
  campaignId: string;
  /** Same id as `action_request.requestId` / worker execution request id. */
  executionRequestId: string;
  timeoutMs: number;
}

type PendingEntry = {
  responseToken: string;
  resolve: (value: unknown) => void;
  reject: (e: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
  executionRequestId: string;
};

const pendingByInteractionId = new Map<string, PendingEntry>();
/** executionRequestId → interactionIds still awaiting a response */
const interactionIdsByExecution = new Map<string, Set<string>>();

function trackInteraction(executionRequestId: string, interactionId: string): void {
  let set = interactionIdsByExecution.get(executionRequestId);
  if (!set) {
    set = new Set();
    interactionIdsByExecution.set(executionRequestId, set);
  }
  set.add(interactionId);
}

function untrackInteraction(executionRequestId: string, interactionId: string): void {
  const set = interactionIdsByExecution.get(executionRequestId);
  if (!set) return;
  set.delete(interactionId);
  if (set.size === 0) interactionIdsByExecution.delete(executionRequestId);
}

/**
 * True when the character row has a seated controlling user (delegate UI to that player's client).
 * Missing / empty `userId` → host runs modals/dice locally (see joiner-rolls.md §3–4).
 */
export async function characterShouldUseRemoteDelegatedUi(characterId: string): Promise<boolean> {
  const ch = await db.characters.get(characterId);
  if (!ch) return false;
  return typeof ch.userId === 'string' && ch.userId.trim().length > 0;
}

export function handleCampaignPlayDelegatedUiResponse(
  envelope: CampaignRealtimeDelegatedUiResponseEnvelopeV1,
): void {
  const pending = pendingByInteractionId.get(envelope.interactionId);
  if (!pending || pending.responseToken !== envelope.responseToken) return;

  clearTimeout(pending.timeoutId);
  pendingByInteractionId.delete(envelope.interactionId);
  untrackInteraction(envelope.executionRequestId, envelope.interactionId);

  if (envelope.error) {
    pending.reject(new Error(envelope.error.message));
    return;
  }
  pending.resolve(envelope.result);
}

/** Reject any in-flight delegated UI for this QBScript execution (script error/timeout/cleanup). */
export function abandonPendingDelegatedUiForExecution(
  executionRequestId: string,
  reason: string = 'Script execution ended',
): void {
  const set = interactionIdsByExecution.get(executionRequestId);
  if (!set) return;
  interactionIdsByExecution.delete(executionRequestId);
  const err = new Error(reason);
  for (const interactionId of set) {
    const p = pendingByInteractionId.get(interactionId);
    if (!p) continue;
    clearTimeout(p.timeoutId);
    pendingByInteractionId.delete(interactionId);
    p.reject(err);
  }
}

export async function hostAwaitDelegatedUiInteraction<T>(options: {
  campaignId: string;
  executionRequestId: string;
  interactionId: string;
  characterId: string;
  body: DelegatedUiRequestBodyV1;
  timeoutMs: number;
  localRunner: () => Promise<T>;
}): Promise<T> {
  const remote = await characterShouldUseRemoteDelegatedUi(options.characterId);
  const send = getCampaignPlaySender(options.campaignId);

  if (!remote || !send) {
    return options.localRunner();
  }

  const responseToken = crypto.randomUUID();
  const sentAt = new Date().toISOString();

  const request: CampaignRealtimeDelegatedUiRequestEnvelopeV1 = {
    v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
    kind: 'delegated_ui_request',
    campaignId: options.campaignId,
    executionRequestId: options.executionRequestId,
    interactionId: options.interactionId,
    responseToken,
    characterId: options.characterId,
    body: options.body,
    sentAt,
  };

  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const p = pendingByInteractionId.get(options.interactionId);
      if (!p) return;
      clearTimeout(p.timeoutId);
      pendingByInteractionId.delete(options.interactionId);
      untrackInteraction(options.executionRequestId, options.interactionId);
      reject(new Error('Delegated UI timed out'));
    }, options.timeoutMs);

    pendingByInteractionId.set(options.interactionId, {
      responseToken,
      resolve: (v) => resolve(v as T),
      reject,
      timeoutId,
      executionRequestId: options.executionRequestId,
    });
    trackInteraction(options.executionRequestId, options.interactionId);

    void send(request as CampaignRealtimeEnvelopeV1).catch((err) => {
      const p = pendingByInteractionId.get(options.interactionId);
      if (!p) return;
      clearTimeout(p.timeoutId);
      pendingByInteractionId.delete(options.interactionId);
      untrackInteraction(options.executionRequestId, options.interactionId);
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

export function subscribeCampaignPlayHostDelegatedUiResponses(campaignId: string): () => void {
  return subscribeCampaignPlayEnvelopes(campaignId, (envelope) => {
    if (envelope.kind !== 'delegated_ui_response') return;
    if (envelope.campaignId !== campaignId) return;
    handleCampaignPlayDelegatedUiResponse(envelope);
  });
}

/** @internal Vitest */
export function __resetDelegatedUiHostStateForTests(): void {
  for (const [, p] of pendingByInteractionId) {
    clearTimeout(p.timeoutId);
  }
  pendingByInteractionId.clear();
  interactionIdsByExecution.clear();
}

/** @internal Vitest — seed pending map without Dexie / realtime send */
export function __registerPendingDelegatedForTest(options: {
  executionRequestId: string;
  interactionId: string;
  responseToken: string;
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}): void {
  const timeoutId = setTimeout(() => {}, 60_000);
  pendingByInteractionId.set(options.interactionId, {
    responseToken: options.responseToken,
    resolve: options.resolve,
    reject: options.reject,
    timeoutId,
    executionRequestId: options.executionRequestId,
  });
  trackInteraction(options.executionRequestId, options.interactionId);
}
