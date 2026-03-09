import { create } from 'zustand';

function key(characterId: string, referenceLabel: string): string {
  return `${characterId}:${referenceLabel}`;
}

export type ScriptComponentAnimationStore = {
  /** characterId:referenceLabel -> { animation, generation }. One add() can trigger all matching components. */
  pending: Map<string, { animation: string; generation: number }>;
  /** Incremented on every add so subscribers re-render. */
  generation: number;
  /** Queue an animation for all components with this referenceLabel on the character's sheet. */
  add: (characterId: string, referenceLabel: string, animationName: string) => void;
  /**
   * If there is a pending animation for (characterId, referenceLabel) with generation newer than
   * lastConsumedGeneration, return it so the component can play once and track the generation.
   */
  getAndConsume: (
    characterId: string,
    referenceLabel: string,
    lastConsumedGeneration: number,
  ) => { animation: string; generation: number } | null;
};

export const useScriptComponentAnimationStore = create<ScriptComponentAnimationStore>()(
  (set, get) => ({
    pending: new Map(),
    generation: 0,

    add(characterId: string, referenceLabel: string, animationName: string) {
      const k = key(characterId, referenceLabel);
      set((state) => {
        const nextGen = state.generation + 1;
        const next = new Map(state.pending);
        next.set(k, { animation: animationName, generation: nextGen });
        return { pending: next, generation: nextGen };
      });
    },

    getAndConsume(
      characterId: string,
      referenceLabel: string,
      lastConsumedGeneration: number,
    ): { animation: string; generation: number } | null {
      const k = key(characterId, referenceLabel);
      const entry = get().pending.get(k);
      if (!entry || entry.generation <= lastConsumedGeneration) return null;
      return entry;
    },
  }),
);
