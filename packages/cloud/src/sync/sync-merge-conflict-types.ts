/** IndexedDB row for an unresolved or historical cloud sync merge conflict. */
export interface SyncMergeConflict {
  id: string;
  rulesetId: string;
  tableName: string;
  entityId: string;
  kind: 'upsert' | 'delete';
  localSnapshot: Record<string, unknown> | null;
  remoteSnapshot: Record<string, unknown> | null;
  /** Remote tombstone timestamp when `kind === 'delete'`. */
  remoteDeletedAt?: string;
  lastSyncedAtUsed: string;
  createdAt: string;
  resolvedAt?: string;
}
