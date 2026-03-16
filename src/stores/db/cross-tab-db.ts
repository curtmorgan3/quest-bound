/**
 * Cross-tab coordination for IndexedDB: when one tab writes to the DB, it broadcasts
 * so other tabs can refresh their live queries instead of each tab blindly reacting.
 * Reduces duplicate work and contention when a large ruleset is open in multiple tabs.
 */

import { create } from 'zustand';

const CHANNEL_NAME = 'qb-db-updates';

export type CrossTabDbMessage = {
  type: 'db-updated';
  table?: string;
};

let channel: BroadcastChannel | null = null;
let listenerAttached = false;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

/** Notify other tabs (not this one) that the DB was updated. Call after a successful mutate. */
export function notifyOtherTabs(tableName?: string): void {
  const ch = getChannel();
  if (!ch) return;
  try {
    ch.postMessage({ type: 'db-updated', table: tableName } satisfies CrossTabDbMessage);
  } catch {
    // Ignore if postMessage fails (e.g. channel closed)
  }
}

interface CrossTabDbStore {
  crossTabDbVersion: number;
  bump: () => void;
}

export const useCrossTabDbStore = create<CrossTabDbStore>()((set) => ({
  crossTabDbVersion: 0,
  bump: () => set((s) => ({ crossTabDbVersion: s.crossTabDbVersion + 1 })),
}));

/** Call once per tab to listen for DB-update messages from other tabs. Idempotent. */
export function initCrossTabDb(): void {
  if (listenerAttached) return;
  const ch = getChannel();
  if (!ch) return;
  listenerAttached = true;
  ch.onmessage = () => {
    useCrossTabDbStore.getState().bump();
  };
}

/** Hook: returns a version that increments when another tab writes to the DB. Use in useLiveQuery deps to re-run. */
export function useCrossTabDbVersion(): number {
  return useCrossTabDbStore((s) => s.crossTabDbVersion);
}
