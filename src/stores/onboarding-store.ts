import { create } from 'zustand';

interface OnboardingStore {
  forceShowAgain: boolean;
  setForceShowAgain: (show: boolean) => void;
}

export const useOnboardingStore = create<OnboardingStore>()((set) => ({
  forceShowAgain: false,
  setForceShowAgain: (show) => set({ forceShowAgain: show }),
}));
