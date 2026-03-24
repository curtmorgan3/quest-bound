/**
 * Versioned Supabase Realtime Broadcast envelopes for campaign play (Phase 2.3+).
 * Payloads are shaped for host-driven Dexie `bulkPut` ingest; tombstones use `deleted: true`.
 */

export const CAMPAIGN_REALTIME_PROTOCOL_VERSION = 1 as const;

/** Single broadcast event name; discriminant is `kind` inside the payload. */
export const CAMPAIGN_PLAY_BROADCAST_EVENT = 'qb_campaign_play';

/** Rows ready for Dexie `bulkPut` (camelCase, include `deleted` when soft-deleted). */
export interface CampaignRealtimeBulkPutBatchV1 {
  /** Dexie table name (camelCase), e.g. `campaignCharacters`. */
  table: string;
  rows: Record<string, unknown>[];
}

export type CampaignRealtimeActionRequestBodyV1 =
  | {
      type: 'execute_action';
      actionId: string;
      characterId: string;
      targetId?: string | null;
      eventType: 'on_activate' | 'on_deactivate';
      callerInventoryItemInstanceId?: string;
      params?: Record<string, unknown>;
    }
  | {
      type: 'use_item';
      itemId: string;
      characterId: string;
      eventType: string;
      inventoryItemInstanceId?: string;
    };

export interface CampaignRealtimeActionRequestEnvelopeV1 {
  v: typeof CAMPAIGN_REALTIME_PROTOCOL_VERSION;
  kind: 'action_request';
  requestId: string;
  campaignId: string;
  sentAt: string;
  /** Scene context for script `Scene` accessor (optional). */
  campaignSceneId?: string;
  body: CampaignRealtimeActionRequestBodyV1;
}

export interface CampaignRealtimeActionResultEnvelopeV1 {
  v: typeof CAMPAIGN_REALTIME_PROTOCOL_VERSION;
  kind: 'action_result';
  requestId: string;
  campaignId: string;
  batches: CampaignRealtimeBulkPutBatchV1[];
  error?: { code: string; message: string };
  /** Host script announcements to replay on joiners (Phase 2.4). */
  announceMessages?: string[];
}

export interface CampaignRealtimeManualCharacterUpdateEnvelopeV1 {
  v: typeof CAMPAIGN_REALTIME_PROTOCOL_VERSION;
  kind: 'manual_character_update';
  updateId: string;
  campaignId: string;
  sentAt: string;
  campaignSceneId?: string;
  batches: CampaignRealtimeBulkPutBatchV1[];
}

export interface CampaignRealtimeHostReactiveResultEnvelopeV1 {
  v: typeof CAMPAIGN_REALTIME_PROTOCOL_VERSION;
  kind: 'host_reactive_result';
  correlationId: string;
  campaignId: string;
  sentAt: string;
  batches: CampaignRealtimeBulkPutBatchV1[];
  announceMessages?: string[];
}

export interface CampaignRealtimeSessionHeartbeatEnvelopeV1 {
  v: typeof CAMPAIGN_REALTIME_PROTOCOL_VERSION;
  kind: 'session_heartbeat';
  campaignId: string;
  role: 'host' | 'client';
  sentAt: string;
}

export type CampaignRealtimeEnvelopeV1 =
  | CampaignRealtimeActionRequestEnvelopeV1
  | CampaignRealtimeActionResultEnvelopeV1
  | CampaignRealtimeManualCharacterUpdateEnvelopeV1
  | CampaignRealtimeHostReactiveResultEnvelopeV1
  | CampaignRealtimeSessionHeartbeatEnvelopeV1;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isBulkPutBatchV1(v: unknown): v is CampaignRealtimeBulkPutBatchV1 {
  if (!isRecord(v)) return false;
  if (typeof v.table !== 'string' || !Array.isArray(v.rows)) return false;
  return v.rows.every(isRecord);
}

function parseBodyV1(raw: unknown): CampaignRealtimeActionRequestBodyV1 | null {
  if (!isRecord(raw)) return null;
  const type = raw.type;
  if (type === 'execute_action') {
    if (typeof raw.actionId !== 'string' || typeof raw.characterId !== 'string') return null;
    const et = raw.eventType;
    if (et !== 'on_activate' && et !== 'on_deactivate') return null;
    const params = raw.params;
    if (params !== undefined && !isRecord(params)) return null;
    const targetId = raw.targetId;
    if (targetId !== undefined && targetId !== null && typeof targetId !== 'string') return null;
    const callerInventoryItemInstanceId = raw.callerInventoryItemInstanceId;
    if (callerInventoryItemInstanceId !== undefined && typeof callerInventoryItemInstanceId !== 'string') {
      return null;
    }
    return {
      type: 'execute_action',
      actionId: raw.actionId,
      characterId: raw.characterId,
      targetId: targetId === undefined ? null : (targetId as string | null),
      eventType: et,
      callerInventoryItemInstanceId,
      params: params as Record<string, unknown> | undefined,
    };
  }
  if (type === 'use_item') {
    if (
      typeof raw.itemId !== 'string' ||
      typeof raw.characterId !== 'string' ||
      typeof raw.eventType !== 'string'
    ) {
      return null;
    }
    const inventoryItemInstanceId = raw.inventoryItemInstanceId;
    if (inventoryItemInstanceId !== undefined && typeof inventoryItemInstanceId !== 'string') {
      return null;
    }
    return {
      type: 'use_item',
      itemId: raw.itemId,
      characterId: raw.characterId,
      eventType: raw.eventType,
      inventoryItemInstanceId,
    };
  }
  return null;
}

/**
 * Parse and validate a broadcast payload. Returns null if the shape is not a supported v1 envelope.
 */
export function parseCampaignRealtimeEnvelope(raw: unknown): CampaignRealtimeEnvelopeV1 | null {
  if (!isRecord(raw)) return null;
  if (raw.v !== CAMPAIGN_REALTIME_PROTOCOL_VERSION) return null;
  const kind = raw.kind;
  if (typeof kind !== 'string') return null;

  if (kind === 'session_heartbeat') {
    if (typeof raw.campaignId !== 'string' || typeof raw.sentAt !== 'string') return null;
    const role = raw.role;
    if (role !== 'host' && role !== 'client') return null;
    return {
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'session_heartbeat',
      campaignId: raw.campaignId,
      role,
      sentAt: raw.sentAt,
    };
  }

  if (typeof raw.campaignId !== 'string') return null;

  if (kind === 'action_request') {
    if (typeof raw.requestId !== 'string' || typeof raw.sentAt !== 'string') return null;
    const body = parseBodyV1(raw.body);
    if (!body) return null;
    const campaignSceneId = raw.campaignSceneId;
    if (campaignSceneId !== undefined && typeof campaignSceneId !== 'string') return null;
    return {
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'action_request',
      requestId: raw.requestId,
      campaignId: raw.campaignId,
      sentAt: raw.sentAt,
      campaignSceneId,
      body,
    };
  }

  if (kind === 'action_result') {
    if (typeof raw.requestId !== 'string') return null;
    if (!Array.isArray(raw.batches) || !raw.batches.every(isBulkPutBatchV1)) return null;
    let error: { code: string; message: string } | undefined;
    if (raw.error !== undefined) {
      if (!isRecord(raw.error)) return null;
      if (typeof raw.error.code !== 'string' || typeof raw.error.message !== 'string') return null;
      error = { code: raw.error.code, message: raw.error.message };
    }
    let announceMessages: string[] | undefined;
    if (raw.announceMessages !== undefined) {
      if (!Array.isArray(raw.announceMessages)) return null;
      if (!raw.announceMessages.every((m) => typeof m === 'string')) return null;
      announceMessages = raw.announceMessages as string[];
    }
    return {
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'action_result',
      requestId: raw.requestId,
      campaignId: raw.campaignId,
      batches: raw.batches,
      error,
      announceMessages,
    };
  }

  if (kind === 'manual_character_update') {
    if (typeof raw.updateId !== 'string' || typeof raw.sentAt !== 'string') return null;
    if (!Array.isArray(raw.batches) || !raw.batches.every(isBulkPutBatchV1)) return null;
    const campaignSceneId = raw.campaignSceneId;
    if (campaignSceneId !== undefined && typeof campaignSceneId !== 'string') return null;
    return {
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'manual_character_update',
      updateId: raw.updateId,
      campaignId: raw.campaignId,
      sentAt: raw.sentAt,
      campaignSceneId,
      batches: raw.batches,
    };
  }

  if (kind === 'host_reactive_result') {
    if (typeof raw.correlationId !== 'string' || typeof raw.sentAt !== 'string') return null;
    if (!Array.isArray(raw.batches) || !raw.batches.every(isBulkPutBatchV1)) return null;
    let announceMessages: string[] | undefined;
    if (raw.announceMessages !== undefined) {
      if (!Array.isArray(raw.announceMessages)) return null;
      if (!raw.announceMessages.every((m) => typeof m === 'string')) return null;
      announceMessages = raw.announceMessages as string[];
    }
    return {
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'host_reactive_result',
      correlationId: raw.correlationId,
      campaignId: raw.campaignId,
      sentAt: raw.sentAt,
      batches: raw.batches,
      announceMessages,
    };
  }

  return null;
}
