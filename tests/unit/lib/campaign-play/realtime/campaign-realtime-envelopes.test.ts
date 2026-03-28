import { parseCampaignRealtimeEnvelope } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { describe, expect, it } from 'vitest';

describe('parseCampaignRealtimeEnvelope', () => {
  it('parses session_heartbeat', () => {
    const raw = {
      v: 1,
      kind: 'session_heartbeat',
      campaignId: 'c1',
      role: 'host',
      sentAt: '2025-01-01T00:00:00.000Z',
    };
    expect(parseCampaignRealtimeEnvelope(raw)).toEqual(raw);
  });

  it('parses action_request', () => {
    const raw = {
      v: 1,
      kind: 'action_request',
      requestId: 'r1',
      campaignId: 'c1',
      sentAt: '2025-01-01T00:00:00.000Z',
      body: {
        type: 'execute_action',
        actionId: 'a1',
        characterId: 'ch1',
        targetId: null,
        eventType: 'on_activate' as const,
      },
    };
    expect(parseCampaignRealtimeEnvelope(raw)).toEqual(raw);
  });

  it('parses use_item action_request', () => {
    const raw = {
      v: 1,
      kind: 'action_request',
      requestId: 'r2',
      campaignId: 'c1',
      sentAt: '2025-01-01T00:00:00.000Z',
      body: { type: 'use_item', itemId: 'i1', characterId: 'ch1', eventType: 'on_consume' },
    };
    expect(parseCampaignRealtimeEnvelope(raw)).toEqual(raw);
  });

  it('parses action_result with batches', () => {
    const raw = {
      v: 1,
      kind: 'action_result',
      requestId: 'r1',
      campaignId: 'c1',
      batches: [{ table: 'characterAttributes', rows: [{ id: 'a1', value: 1 }] }],
    };
    expect(parseCampaignRealtimeEnvelope(raw)).toEqual(raw);
  });

  it('rejects wrong version', () => {
    expect(parseCampaignRealtimeEnvelope({ v: 2, kind: 'session_heartbeat' })).toBeNull();
  });

  it('rejects invalid batches', () => {
    expect(
      parseCampaignRealtimeEnvelope({
        v: 1,
        kind: 'action_result',
        requestId: 'r1',
        campaignId: 'c1',
        batches: [{ table: 1, rows: [] }],
      }),
    ).toBeNull();
  });

  it('parses manual_character_update with optional campaignSceneId', () => {
    const raw = {
      v: 1,
      kind: 'manual_character_update' as const,
      updateId: 'u1',
      campaignId: 'c1',
      sentAt: '2025-01-01T00:00:00.000Z',
      campaignSceneId: 'scene-1',
      batches: [{ table: 'characterAttributes', rows: [{ id: 'a1', characterId: 'ch1' }] }],
    };
    expect(parseCampaignRealtimeEnvelope(raw)).toEqual(raw);
  });

  it('parses host_reactive_result with optional announceMessages', () => {
    const raw = {
      v: 1,
      kind: 'host_reactive_result' as const,
      correlationId: 'u1',
      campaignId: 'c1',
      sentAt: '2025-01-01T00:00:00.000Z',
      batches: [{ table: 'characterAttributes', rows: [{ id: 'a1' }] }],
      announceMessages: ['hello'],
    };
    expect(parseCampaignRealtimeEnvelope(raw)).toEqual(raw);
  });

  it('parses delegated_ui_request select_character with roster snapshot', () => {
    const raw = {
      v: 1,
      kind: 'delegated_ui_request' as const,
      campaignId: 'c1',
      executionRequestId: 'ex1',
      interactionId: 'int1',
      responseToken: 'tok1',
      characterId: 'ch-surface',
      sentAt: '2025-01-01T00:00:00.000Z',
      body: {
        interactionType: 'select_character' as const,
        rulesetId: 'r1',
        campaignId: 'c1',
        rosterNpcs: [{ characterId: 'npc1', name: 'Goblin', image: null }],
        rosterPcs: [{ characterId: 'pc1', name: 'Alice' }],
      },
    };
    expect(parseCampaignRealtimeEnvelope(raw)).toEqual(raw);
  });

  it('rejects delegated_ui_request select_character with invalid roster row', () => {
    const raw = {
      v: 1,
      kind: 'delegated_ui_request' as const,
      campaignId: 'c1',
      executionRequestId: 'ex1',
      interactionId: 'int1',
      responseToken: 'tok1',
      characterId: 'ch-surface',
      sentAt: '2025-01-01T00:00:00.000Z',
      body: {
        interactionType: 'select_character' as const,
        rulesetId: 'r1',
        rosterNpcs: [{ characterId: 'npc1', name: 1 }],
        rosterPcs: [],
      },
    };
    expect(parseCampaignRealtimeEnvelope(raw)).toBeNull();
  });

  it('parses campaign_roster_update', () => {
    const raw = {
      v: 1,
      kind: 'campaign_roster_update' as const,
      updateId: 'u-roster',
      campaignId: 'c1',
      sentAt: '2025-01-01T00:00:00.000Z',
      batches: [
        { table: 'characters', rows: [{ id: 'ch1', rulesetId: 'r1', userId: 'u1' }] },
        { table: 'campaignCharacters', rows: [{ id: 'cc1', campaignId: 'c1', characterId: 'ch1' }] },
      ],
    };
    expect(parseCampaignRealtimeEnvelope(raw)).toEqual(raw);
  });
});
