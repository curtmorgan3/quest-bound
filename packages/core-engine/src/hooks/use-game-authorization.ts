import { checkGameAuthorization } from '@/lib/cloud';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import { useEffect, useState } from 'react';
import { GAME_ID } from '../game-mode';
import { useGameMode } from './use-game-mode';

const authCache = new Map<string, boolean>();

/**
 * Resolves whether the current user is authorized to access the deployed game.
 * Returns null while loading, true if authorized, false if not.
 * No-ops outside of game mode (returns null).
 */
export function useGameAuthorization(): boolean | null {
  const isGameMode = useGameMode();
  const { isAuthenticated, cloudUser } = useCloudAuthStore();
  const cacheKey = GAME_ID && cloudUser?.id ? `${GAME_ID}:${cloudUser.id}` : null;

  const [authorized, setAuthorized] = useState<boolean | null>(
    cacheKey != null ? (authCache.get(cacheKey) ?? null) : null,
  );

  useEffect(() => {
    if (!isGameMode || !isAuthenticated || !cloudUser?.id || !cacheKey) {
      setAuthorized(null);
      return;
    }
    if (authCache.has(cacheKey)) {
      setAuthorized(authCache.get(cacheKey)!);
      return;
    }
    checkGameAuthorization(GAME_ID, cloudUser.id).then((result) => {
      authCache.set(cacheKey, result);
      setAuthorized(result);
    });
  }, [isGameMode, isAuthenticated, cloudUser?.id, cacheKey]);

  return authorized;
}
