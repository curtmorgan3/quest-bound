import { syncJoinerCharacterStateToCampaignRealtime } from '@/lib/campaign-play/join/joiner-campaign-character';
import { filterNotSoftDeleted } from '@/lib/data/soft-delete';
import { db } from '@/stores';
import { useCampaignPlaySessionStore } from '@/stores/campaign-play-session-store';
import type { CampaignCharacter } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef } from 'react';
import { useCampaignPlayRealtime } from './use-campaign-play-realtime';

export interface UseCampaignPlayClientForCharacterOptions {
  characterId: string | undefined;
  propCampaignId?: string;
  propCampaignSceneId?: string;
  realtimePlayEnabled: boolean;
}

export interface UseCampaignPlayClientForCharacterResult {
  /** Campaign id for scripts, attributes sync, and play session (props override Dexie link). */
  playCampaignId: string | undefined;
  /** Scene id from props or linked campaignCharacter row. */
  playCampaignSceneId: string | undefined;
  playCampaignCharacterId: string | undefined;
}

/**
 * When a character is on a campaign roster, enters a client play session, subscribes to Supabase
 * Realtime, and pushes local roster + sheet rows after subscribe (so join-time broadcasts that
 * ran before a sender existed are retried).
 */
export function useCampaignPlayClientForCharacter({
  characterId,
  propCampaignId,
  propCampaignSceneId,
  realtimePlayEnabled,
}: UseCampaignPlayClientForCharacterOptions): UseCampaignPlayClientForCharacterResult {
  const session = useCampaignPlaySessionStore((s) => s.session);
  const lastSyncedKeyRef = useRef<string | null>(null);

  const campaignCharacterLink = useLiveQuery(async (): Promise<
    CampaignCharacter | null | undefined
  > => {
    if (!characterId) return null;
    const rows = filterNotSoftDeleted(
      await db.campaignCharacters.where('characterId').equals(characterId).toArray(),
    );
    if (propCampaignId) {
      return rows.find((r) => r.campaignId === propCampaignId) ?? null;
    }
    if (rows.length === 0) return null;
    rows.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
    return rows[0] ?? null;
  }, [characterId, propCampaignId]);

  const playCampaignId = useMemo(
    () => propCampaignId ?? campaignCharacterLink?.campaignId,
    [propCampaignId, campaignCharacterLink?.campaignId],
  );

  const playCampaignCharacterId = useMemo(() => {
    if (!campaignCharacterLink || !playCampaignId) return undefined;
    return campaignCharacterLink.campaignId === playCampaignId
      ? campaignCharacterLink.id
      : undefined;
  }, [campaignCharacterLink, playCampaignId]);

  const playCampaignSceneId = useMemo(() => {
    if (propCampaignSceneId) return propCampaignSceneId;
    if (campaignCharacterLink?.campaignId === playCampaignId) {
      return campaignCharacterLink?.campaignSceneId;
    }
    return undefined;
  }, [propCampaignSceneId, campaignCharacterLink, playCampaignId]);

  const shouldBootstrapClient = Boolean(
    realtimePlayEnabled &&
    characterId &&
    playCampaignId &&
    campaignCharacterLink != null &&
    !(session?.role === 'host' && session.campaignId === playCampaignId),
  );

  useEffect(() => {
    if (!shouldBootstrapClient || !playCampaignId) return;

    useCampaignPlaySessionStore.getState().enterSession({
      campaignId: playCampaignId,
      realtimeChannelName: null,
      role: 'client',
      hostSessionActive: true,
    });

    return () => {
      const s = useCampaignPlaySessionStore.getState().session;
      if (s?.campaignId === playCampaignId && s.role === 'client') {
        useCampaignPlaySessionStore.getState().clearSessionIfCampaign(playCampaignId);
      }
    };
  }, [shouldBootstrapClient, playCampaignId]);

  useCampaignPlayRealtime({
    campaignId: playCampaignId,
    enabled: shouldBootstrapClient && !!playCampaignId,
  });

  useEffect(() => {
    if (session?.realtimeStatus !== 'subscribed') {
      lastSyncedKeyRef.current = null;
    }
  }, [session?.realtimeStatus]);

  useEffect(() => {
    if (!characterId || !playCampaignId || !playCampaignCharacterId) return;
    if (session?.campaignId !== playCampaignId || session.role !== 'client') return;
    if (session.realtimeStatus !== 'subscribed') return;

    const key = `${playCampaignId}:${playCampaignCharacterId}:${characterId}`;
    if (lastSyncedKeyRef.current === key) return;
    lastSyncedKeyRef.current = key;

    void syncJoinerCharacterStateToCampaignRealtime({
      campaignId: playCampaignId,
      characterId,
      campaignCharacterId: playCampaignCharacterId,
    }).catch(() => {});
  }, [
    characterId,
    playCampaignId,
    playCampaignCharacterId,
    session?.campaignId,
    session?.role,
    session?.realtimeStatus,
  ]);

  return {
    playCampaignId,
    playCampaignSceneId,
    playCampaignCharacterId,
  };
}
