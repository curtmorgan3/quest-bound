import { cloudClient } from '@/lib/cloud/client';
import {
  CAMPAIGN_PLAY_HEARTBEAT_INTERVAL_MS,
  CAMPAIGN_PLAY_HOST_STALE_AFTER_MS,
  CampaignPlayHostActionQueue,
  dispatchCampaignPlayEnvelope,
  registerCampaignPlaySender,
  startCampaignPlayClientActionBridge,
  stopCampaignPlayClientActionBridge,
  subscribeCampaignPlayTransport,
  unregisterCampaignPlaySender,
  type CampaignPlayTransportHandle,
  type CampaignRealtimeEnvelopeV1,
} from '@/lib/campaign-play/realtime';
import { useCampaignPlaySessionStore } from '@/stores/campaign-play-session-store';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export interface UseCampaignPlayRealtimeOptions {
  campaignId: string | undefined;
  enabled: boolean;
}

/**
 * Phase 2.3: subscribe to the private campaign Broadcast channel for the active session.
 * Host emits heartbeats; clients infer `hostSessionActive` from the last host heartbeat age.
 */
export function useCampaignPlayRealtime({
  campaignId,
  enabled,
}: UseCampaignPlayRealtimeOptions): void {
  const session = useCampaignPlaySessionStore((s) => s.session);
  const authToastShownRef = useRef(false);

  useEffect(() => {
    if (!enabled || !campaignId) return;
    if (!session || session.campaignId !== campaignId) return;

    if (!cloudClient) {
      useCampaignPlaySessionStore.getState().updateSessionIfCampaign(campaignId, {
        realtimeStatus: 'error',
        realtimeLastError: 'Cloud is not configured',
      });
      return;
    }

    const role = session.role;
    let cancelled = false;
    let hostQueue: CampaignPlayHostActionQueue | null = null;
    const transportRef: { current: CampaignPlayTransportHandle | null } = { current: null };
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let staleCheckTimer: ReturnType<typeof setInterval> | null = null;
    const lastHostHeartbeatAt = { t: Date.now() };

    const clearTimers = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (staleCheckTimer) clearInterval(staleCheckTimer);
      heartbeatTimer = null;
      staleCheckTimer = null;
    };

    const onEnvelope = (envelope: CampaignRealtimeEnvelopeV1) => {
      if (envelope.campaignId !== campaignId) return;
      if (envelope.kind === 'session_heartbeat' && envelope.role === 'host') {
        lastHostHeartbeatAt.t = Date.now();
        if (role === 'client') {
          useCampaignPlaySessionStore.getState().updateSessionIfCampaign(campaignId, {
            hostSessionActive: true,
          });
        }
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
            store.updateSessionIfCampaign(campaignId, {
              realtimeStatus: 'subscribed',
              realtimeChannelName: transport.channelName,
              realtimeLastError: null,
            });

            if (role === 'host') {
              hostQueue = new CampaignPlayHostActionQueue(campaignId);
              hostQueue.start();
            } else if (role === 'client') {
              startCampaignPlayClientActionBridge(campaignId);
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
          } else if (status === 'CLOSED') {
            store.updateSessionIfCampaign(campaignId, {
              realtimeStatus: 'disconnected',
              realtimeChannelName: null,
            });
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
      hostQueue?.stop();
      hostQueue = null;
      if (role === 'client') {
        stopCampaignPlayClientActionBridge();
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
  }, [enabled, campaignId, session?.campaignId, session?.role]);
}
