import { create } from 'zustand';

export interface BeforeInstallPromptEvent {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaInstallStore {
  deferredPrompt: BeforeInstallPromptEvent | null;
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  triggerInstall: () => Promise<boolean>;
}

export const usePwaInstallStore = create<PwaInstallStore>()((set, get) => ({
  deferredPrompt: null,
  setDeferredPrompt: (deferredPrompt) => set({ deferredPrompt }),
  triggerInstall: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      set({ deferredPrompt: null });
      return true;
    }
    return false;
  },
}));
