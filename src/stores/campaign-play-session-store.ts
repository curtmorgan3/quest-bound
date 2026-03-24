import { create } from 'zustand';

export type CampaignPlayRole = 'host' | 'client';

export type CampaignPlayRealtimeConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'subscribed'
  | 'disconnected'
  | 'error';

export interface CampaignPlaySession {
  campaignId: string;
  /** Realtime channel name; set when transport exists (Phase 2.3+). */
  realtimeChannelName: string | null;
  role: CampaignPlayRole;
  /** When role is client: host still connected to the session (Phase 2.3+). */
  hostSessionActive: boolean;
  realtimeStatus: CampaignPlayRealtimeConnectionStatus;
  realtimeLastError: string | null;
}

interface CampaignPlaySessionState {
  session: CampaignPlaySession | null;
  enterSession: (
    partial: Pick<CampaignPlaySession, 'campaignId' | 'realtimeChannelName' | 'role'> & {
      hostSessionActive?: boolean;
      realtimeStatus?: CampaignPlayRealtimeConnectionStatus;
      realtimeLastError?: string | null;
    },
  ) => void;
  clearSessionIfCampaign: (campaignId: string) => void;
  setRealtimeChannelName: (campaignId: string, channelName: string | null) => void;
  setHostSessionActive: (active: boolean) => void;
  updateSessionIfCampaign: (
    campaignId: string,
    patch: Partial<
      Pick<
        CampaignPlaySession,
        | 'realtimeChannelName'
        | 'realtimeStatus'
        | 'realtimeLastError'
        | 'hostSessionActive'
      >
    >,
  ) => void;
}

export const useCampaignPlaySessionStore = create<CampaignPlaySessionState>((set, get) => ({
  session: null,
  enterSession: (partial) =>
    set({
      session: {
        campaignId: partial.campaignId,
        realtimeChannelName: partial.realtimeChannelName,
        role: partial.role,
        hostSessionActive: partial.hostSessionActive ?? true,
        realtimeStatus: partial.realtimeStatus ?? 'idle',
        realtimeLastError: partial.realtimeLastError ?? null,
      },
    }),
  clearSessionIfCampaign: (campaignId) => {
    const cur = get().session;
    if (cur?.campaignId === campaignId) {
      set({ session: null });
    }
  },
  setRealtimeChannelName: (campaignId, channelName) => {
    const cur = get().session;
    if (cur?.campaignId !== campaignId) return;
    set({ session: { ...cur, realtimeChannelName: channelName } });
  },
  setHostSessionActive: (active) => {
    const cur = get().session;
    if (!cur) return;
    set({ session: { ...cur, hostSessionActive: active } });
  },
  updateSessionIfCampaign: (campaignId, patch) => {
    const cur = get().session;
    if (cur?.campaignId !== campaignId) return;
    set({ session: { ...cur, ...patch } });
  },
}));
