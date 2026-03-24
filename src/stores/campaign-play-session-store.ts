import { create } from 'zustand';

export type CampaignPlayRole = 'host' | 'client';

export interface CampaignPlaySession {
  campaignId: string;
  /** Realtime channel name; set when transport exists (Phase 2.3+). */
  realtimeChannelName: string | null;
  role: CampaignPlayRole;
  /** When role is client: host still connected to the session (Phase 2.3+). */
  hostSessionActive: boolean;
}

interface CampaignPlaySessionState {
  session: CampaignPlaySession | null;
  enterSession: (
    partial: Pick<CampaignPlaySession, 'campaignId' | 'realtimeChannelName' | 'role'> & {
      hostSessionActive?: boolean;
    },
  ) => void;
  clearSessionIfCampaign: (campaignId: string) => void;
  setRealtimeChannelName: (campaignId: string, channelName: string | null) => void;
  setHostSessionActive: (active: boolean) => void;
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
}));
