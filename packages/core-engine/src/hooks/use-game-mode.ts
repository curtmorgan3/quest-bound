import { GAME_MODE } from '../game-mode';
import { useFeatureFlag } from './use-feature-flag';

/**
 * Returns true when the app is running in game mode — either via the
 * VITE_GAME_MODE build flag or the `game-mode` feature flag (dev only).
 * Reactive: updates immediately when the feature flag is toggled.
 * The boot sequence and routing changes take effect on the next page load.
 */
export function useGameMode(): boolean {
  const flagEnabled = useFeatureFlag('game-mode');
  return GAME_MODE || flagEnabled;
}
