import { useScriptComponentAnimationStore } from '@/stores/script-component-animation-store';
import { useRef } from 'react';

function storeKey(characterId: string, referenceLabel: string): string {
  return `${characterId}:${referenceLabel}`;
}

/**
 * Returns the current script-triggered animation name for this (characterId, referenceLabel), if any.
 * Each component instance tracks the last consumed generation so the animation plays once per trigger.
 */
export function useComponentAnimationTrigger(
  characterId: string,
  referenceLabel: string,
): string | null {
  const lastConsumedRef = useRef(0);

  // Subscribe to this key's entry so we re-render when an animation is added for it
  const entry = useScriptComponentAnimationStore((s) => {
    const k = storeKey(characterId, referenceLabel);
    return s.pending.get(k) ?? null;
  });

  if (entry && entry.generation > lastConsumedRef.current) {
    lastConsumedRef.current = entry.generation;
    return entry.animation;
  }
  return null;
}
