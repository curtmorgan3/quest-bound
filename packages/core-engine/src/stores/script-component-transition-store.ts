import { create } from 'zustand';

/**
 * One queued CSS-transition spec for a (characterId, componentId, key) tuple. Renderer maps `key`
 * (a flat sheet-component key like `rotation` or `backgroundColor`) to the CSS property used in
 * the `transition` declaration. `expiresAt` is `performance.now() + durationMs + buffer`.
 */
export interface ComponentTransitionEntry {
  durationMs: number;
  cubicBezier: string;
  expiresAt: number;
}

function key(characterId: string, componentId: string): string {
  return `${characterId}:${componentId}`;
}

const EXPIRY_BUFFER_MS = 50;

export type ScriptComponentTransitionStore = {
  /** characterId:componentId -> Map of flat key -> entry. */
  byComponent: Map<string, Map<string, ComponentTransitionEntry>>;
  generation: number;
  /**
   * Queue transitions for a (characterId, componentId, key). Replaces any existing entry for the
   * same key. Auto-cleans after `durationMs + 50ms` so subsequent un-animated `set` calls snap.
   */
  add: (
    entries: Array<{
      characterId: string;
      componentId: string;
      key: string;
      durationMs: number;
      cubicBezier: string;
    }>,
  ) => void;
  /** Drop expired entries; called by the cleanup timer. */
  prune: () => void;
};

let pruneTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePrune(at: number) {
  if (typeof window === 'undefined') return;
  const now = performance.now();
  const delay = Math.max(0, at - now);
  if (pruneTimer != null) {
    clearTimeout(pruneTimer);
  }
  pruneTimer = setTimeout(() => {
    pruneTimer = null;
    useScriptComponentTransitionStore.getState().prune();
  }, delay);
}

export const useScriptComponentTransitionStore = create<ScriptComponentTransitionStore>()(
  (set, get) => ({
    byComponent: new Map(),
    generation: 0,

    add(entries) {
      if (entries.length === 0) return;
      const now = performance.now();
      let earliestExpiry = Infinity;
      set((state) => {
        const next = new Map(state.byComponent);
        for (const e of entries) {
          const k = key(e.characterId, e.componentId);
          const expiresAt = now + e.durationMs + EXPIRY_BUFFER_MS;
          if (expiresAt < earliestExpiry) earliestExpiry = expiresAt;
          const existing = next.get(k);
          const perKey = existing ? new Map(existing) : new Map<string, ComponentTransitionEntry>();
          perKey.set(e.key, {
            durationMs: e.durationMs,
            cubicBezier: e.cubicBezier,
            expiresAt,
          });
          next.set(k, perKey);
        }
        return { byComponent: next, generation: state.generation + 1 };
      });
      if (Number.isFinite(earliestExpiry)) {
        schedulePrune(earliestExpiry);
      }
    },

    prune() {
      const now = performance.now();
      const cur = get().byComponent;
      let changed = false;
      const next = new Map<string, Map<string, ComponentTransitionEntry>>();
      let nextEarliest = Infinity;
      for (const [k, perKey] of cur) {
        const survivingEntries = new Map<string, ComponentTransitionEntry>();
        for (const [propKey, entry] of perKey) {
          if (entry.expiresAt <= now) {
            changed = true;
            continue;
          }
          survivingEntries.set(propKey, entry);
          if (entry.expiresAt < nextEarliest) nextEarliest = entry.expiresAt;
        }
        if (survivingEntries.size > 0) {
          next.set(k, survivingEntries);
        } else if (perKey.size > 0) {
          changed = true;
        }
      }
      if (changed) {
        set((state) => ({ byComponent: next, generation: state.generation + 1 }));
      }
      if (Number.isFinite(nextEarliest)) {
        schedulePrune(nextEarliest);
      }
    },
  }),
);
