import { hasCompletedOnboarding } from '@/utils/onboarding-storage';
import { useCallback, useEffect, useState } from 'react';

export function useOnboardingStatus(userId: string | null) {
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    const value = await hasCompletedOnboarding(userId);
    setHasCompleted(value);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setHasCompleted(null);
      return;
    }
    let cancelled = false;
    hasCompletedOnboarding(userId).then((value) => {
      if (!cancelled) setHasCompleted(value);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { hasCompleted, isLoading: hasCompleted === null, refetch };
}
