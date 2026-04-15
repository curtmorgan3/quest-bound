import {
  CAMPAIGN_PLAY_RECONNECT_MAX_ATTEMPTS,
  nextCampaignPlayReconnectDelayMs,
} from '@/lib/campaign-play/campaign-play-reconnect-backoff';
import { campaignPlayEnvelopeRefreshesMultiplayerView } from '@/lib/campaign-play/campaign-play-stale-sync';
import { chainCampaignRosterIngest } from '@/lib/campaign-play/realtime/campaign-play-host-roster-ingest-tail';
import { ingestCampaignRosterUpdateIfValid } from '@/lib/campaign-play/realtime/ingest-campaign-roster-update';
import { cloudClient } from '@/lib/cloud/client';
import {
  CAMPAIGN_PLAY_HEARTBEAT_INTERVAL_MS,
  CAMPAIGN_PLAY_HOST_STALE_AFTER_MS,
  CampaignPlayHostActionQueue,
  CampaignPlayHostManualQueue,
  dispatchCampaignPlayEnvelope,
  registerCampaignPlaySender,
  startCampaignPlayClientActionBridge,
  startCampaignPlayDelegatedUiClient,
  stopCampaignPlayClientActionBridge,
  stopCampaignPlayDelegatedUiClient,
  subscribeCampaignPlayTransport,
  unregisterCampaignPlaySender,
  type CampaignPlayTransportHandle,
  type CampaignRealtimeEnvelopeV1,
} from '@/lib/campaign-play/realtime';
import { onAuthStateChange } from '@/lib/cloud/auth';
import { db } from '@/stores';
import { useCampaignPlaySessionStore } from '@/stores/campaign-play-session-store';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export interface UseCampaignPlayRealtimeOptions {
  campaignId: string | undefined;
  enabled: boolean;
}

/**
 * Phase 2.3+: private Broadcast for campaign play.
 * Phase 2.7: resubscribe with backoff after errors, bump on online/visibility/auth recovery,
 * and mark joiner data as potentially stale until the next host-driven batch.
 */
export function useCampaignPlayRealtime({
  campaignId,
  enabled,
}: UseCampaignPlayRealtimeOptions): void {
  const session = useCampaignPlaySessionStore((s) => s.session);
  const authToastShownRef = useRef(false);
  const [reconnectEpoch, setReconnectEpoch] = useState(0);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    if (!enabled || !campaignId) return;
    // Read session from the store here — not from render closure. An earlier effect in the same
    // commit (e.g. campaign dashboard enterSession) may have already set the session while this
    // render still saw session=null, which would skip subscribe/sender registration entirely.
    const liveSession = useCampaignPlaySessionStore.getState().session;
    if (!liveSession || liveSession.campaignId !== campaignId) return;

    if (!cloudClient) {
      useCampaignPlaySessionStore.getState().updateSessionIfCampaign(campaignId, {
        realtimeStatus: 'error',
        realtimeLastError: 'Cloud is not configured',
      });
      return;
    }

    const role = liveSession.role;
    let cancelled = false;
    let hostQueue: CampaignPlayHostActionQueue | null = null;
    let hostManualQueue: CampaignPlayHostManualQueue | null = null;
    const transportRef: { current: CampaignPlayTransportHandle | null } = { current: null };
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let staleCheckTimer: ReturnType<typeof setInterval> | null = null;
    const lastHostHeartbeatAt = { t: Date.now() };
    const retryTimerRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };

    const clearTimers = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (staleCheckTimer) clearInterval(staleCheckTimer);
      heartbeatTimer = null;
      staleCheckTimer = null;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      const attempt = reconnectAttemptRef.current;
      if (attempt >= CAMPAIGN_PLAY_RECONNECT_MAX_ATTEMPTS) {
        toast.error('Campaign realtime: reconnect limit reached. Reload the page or leave the session.');
        return;
      }
      if (retryTimerRef.current) return;
      const delay = nextCampaignPlayReconnectDelayMs(attempt);
      reconnectAttemptRef.current = attempt + 1;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        if (!cancelled) setReconnectEpoch((e) => e + 1);
      }, delay);
    };

    const tryBumpReconnectAfterDrop = () => {
      if (cancelled) return;
      const s = useCampaignPlaySessionStore.getState().session;
      if (s?.campaignId !== campaignId) return;
      if (s.realtimeStatus === 'error' || s.realtimeStatus === 'disconnected') {
        reconnectAttemptRef.current = 0;
        setReconnectEpoch((e) => e + 1);
      }
    };

    const onOnline = () => tryBumpReconnectAfterDrop();

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      tryBumpReconnectAfterDrop();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    const unsubAuth = onAuthStateChange((event, sess) => {
      if (cancelled || !sess) return;
      if (event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED') return;
      tryBumpReconnectAfterDrop();
    });

    const onEnvelope = (envelope: CampaignRealtimeEnvelopeV1) => {
      if (envelope.campaignId !== campaignId) return;
      if (envelope.kind === 'campaign_roster_update') {
        chainCampaignRosterIngest(campaignId, () => ingestCampaignRosterUpdateIfValid(db, envelope));
      }
      if (envelope.kind === 'session_heartbeat' && envelope.role === 'host') {
        lastHostHeartbeatAt.t = Date.now();
        if (role === 'client') {
          useCampaignPlaySessionStore.getState().updateSessionIfCampaign(campaignId, {
            hostSessionActive: true,
          });
        }
      }
      if (
        role === 'client' &&
        campaignPlayEnvelopeRefreshesMultiplayerView(envelope.kind)
      ) {
        useCampaignPlaySessionStore.getState().updateSessionIfCampaign(campaignId, {
          multiplayerDataMayBeStale: false,
        });
      }
      dispatchCampaignPlayEnvelope(campaignId, envelope);
    };

    void (async () => {
      const { data: auth } = await cloudClient.auth.getSession();
      if (cancelled) return;

      if (!auth.session) {
        useCampaignPlaySessionStore.getState().updateSessionIfCampaign(campaignId, {
          realtimeStatus: 'error',
          realtimeLastError: 'Sign in required for campaign realtime',
          realtimeChannelName: null,
        });
        if (!authToastShownRef.current) {
          toast.error('Sign in required for campaign play realtime');
          authToastShownRef.current = true;
        }
        return;
      }
      authToastShownRef.current = false;

      useCampaignPlaySessionStore.getState().updateSessionIfCampaign(campaignId, {
        realtimeStatus: 'connecting',
        realtimeLastError: null,
      });

      const transport = subscribeCampaignPlayTransport(cloudClient, {
        campaignId,
        role,
        onEnvelope,
        onSubscribeStatus: (status, err) => {
          if (cancelled) return;
          const store = useCampaignPlaySessionStore.getState();

          if (status === 'SUBSCRIBED') {
            reconnectAttemptRef.current = 0;

            store.updateSessionIfCampaign(campaignId, {
              realtimeStatus: 'subscribed',
              realtimeChannelName: transport.channelName,
              realtimeLastError: null,
            });

            if (role === 'client') {
              store.updateSessionIfCampaign(campaignId, {
                multiplayerDataMayBeStale: true,
              });
            } else {
              store.updateSessionIfCampaign(campaignId, {
                multiplayerDataMayBeStale: false,
              });
            }

            if (role === 'host') {
              hostQueue = new CampaignPlayHostActionQueue(campaignId);
              hostQueue.start();
              hostManualQueue = new CampaignPlayHostManualQueue(campaignId);
              hostManualQueue.start();
            } else if (role === 'client') {
              startCampaignPlayClientActionBridge(campaignId);
              startCampaignPlayDelegatedUiClient(campaignId);
            }

            if (role === 'host') {
              const sendBeat = () => {
                void transport.sendEnvelope({
                  v: 1,
                  kind: 'session_heartbeat',
                  campaignId,
                  role: 'host',
                  sentAt: new Date().toISOString(),
                });
              };
              sendBeat();
              heartbeatTimer = setInterval(sendBeat, CAMPAIGN_PLAY_HEARTBEAT_INTERVAL_MS);
            }

            if (role === 'client') {
              lastHostHeartbeatAt.t = Date.now();
              staleCheckTimer = setInterval(() => {
                if (Date.now() - lastHostHeartbeatAt.t > CAMPAIGN_PLAY_HOST_STALE_AFTER_MS) {
                  useCampaignPlaySessionStore.getState().updateSessionIfCampaign(campaignId, {
                    hostSessionActive: false,
                  });
                }
              }, 5_000);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const msg =
              err?.message ??
              (status === 'TIMED_OUT'
                ? 'Realtime connection timed out'
                : 'Realtime channel error');
            store.updateSessionIfCampaign(campaignId, {
              realtimeStatus: 'error',
              realtimeLastError: msg,
              realtimeChannelName: null,
            });
            toast.error(`Campaign realtime: ${msg}`);
            scheduleReconnect();
          } else if (status === 'CLOSED') {
            store.updateSessionIfCampaign(campaignId, {
              realtimeStatus: 'disconnected',
              realtimeChannelName: null,
            });
            scheduleReconnect();
          }
        },
      });

      transportRef.current = transport;
      registerCampaignPlaySender(campaignId, transport.sendEnvelope);
      useCampaignPlaySessionStore.getState().updateSessionIfCampaign(campaignId, {
        realtimeChannelName: transport.channelName,
      });

      if (cancelled) {
        void transport.unsubscribe();
        transportRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      clearTimers();
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      unsubAuth();
      hostQueue?.stop();
      hostQueue = null;
      hostManualQueue?.stop();
      hostManualQueue = null;
      if (role === 'client') {
        stopCampaignPlayClientActionBridge();
        stopCampaignPlayDelegatedUiClient();
      }
      unregisterCampaignPlaySender(campaignId);
      const t = transportRef.current;
      transportRef.current = null;
      if (t) {
        void t.unsubscribe().then(() => {
          useCampaignPlaySessionStore.getState().updateSessionIfCampaign(campaignId, {
            realtimeStatus: 'disconnected',
            realtimeChannelName: null,
          });
        });
      } else {
        useCampaignPlaySessionStore.getState().updateSessionIfCampaign(campaignId, {
          realtimeStatus: 'disconnected',
          realtimeChannelName: null,
        });
      }
    };
  }, [enabled, campaignId, session?.campaignId, session?.role, reconnectEpoch]);
}
