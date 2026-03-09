import { useScriptComponentAnimationStore } from '@/stores/script-component-animation-store';

function storeKey(characterId: string, referenceLabel: string): string {
  return `${characterId}:${referenceLabel}`;
}

/**
 * Returns the current script-triggered animation entry for this (characterId, referenceLabel), if any.
 * The generation is included so callers can use it as a React key, forcing a remount (and CSS
 * animation replay) on every new trigger — even when the animation name repeats.
 */
export function useComponentAnimationTrigger(
  characterId: string,
  referenceLabel: string,
): { animation: string; generation: number } | null {
  return useScriptComponentAnimationStore((s) => {
    const k = storeKey(characterId, referenceLabel);
    return s.pending.get(k) ?? null;
  });
}
