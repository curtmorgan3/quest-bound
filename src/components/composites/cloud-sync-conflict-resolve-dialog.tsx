import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getSyncEntityTypeLabelOne } from '@/lib/cloud/sync/sync-entity-labels';
import { resolveSyncMergeConflict } from '@/lib/cloud/sync/sync-merge-conflict-actions';
import type { SyncMergeConflict } from '@/lib/cloud/sync/sync-merge-conflict-types';
import { pickOptionalRowDisplayName } from '@/lib/cloud/sync/sync-pull-review-items';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import type { DB } from '@/stores/db/hooks/types';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

/** If `value` is a string that looks like JSON object/array, return parsed value; else return `value`. */
function tryParseJsonString(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  if (t.length === 0) return value;
  const first = t[0];
  if (first !== '{' && first !== '[') return value;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return value;
  }
}

/** Recursively parse JSON-looking strings so comparisons and display match structured data. */
function normalizeDeep(value: unknown): unknown {
  let v = value;
  if (typeof v === 'string') {
    v = tryParseJsonString(v);
  }
  if (Array.isArray(v)) {
    return v.map((item) => normalizeDeep(item));
  }
  if (v !== null && typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, child] of Object.entries(obj)) {
      out[k] = normalizeDeep(child);
    }
    return out;
  }
  return v;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') {
    return a === b;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]!));
  }
  if (Array.isArray(a) || Array.isArray(b)) return false;
  const ak = Object.keys(a as object).sort();
  const bk = Object.keys(b as object).sort();
  if (ak.length !== bk.length) return false;
  if (!ak.every((k, i) => k === bk[i])) return false;
  return ak.every((k) =>
    deepEqual(
      (a as Record<string, unknown>)[k!],
      (b as Record<string, unknown>)[k!],
    ),
  );
}

function valuesEqualForDiff(a: unknown, b: unknown): boolean {
  return deepEqual(normalizeDeep(a), normalizeDeep(b));
}

function isNullish(value: unknown): boolean {
  return value === null || value === undefined;
}

function getDiffingKeys(
  local: Record<string, unknown> | null,
  remote: Record<string, unknown> | null,
): string[] {
  const keys = new Set([
    ...Object.keys(local ?? {}),
    ...Object.keys(remote ?? {}),
  ]);
  return [...keys]
    .filter((k) => {
      const lv = local?.[k];
      const rv = remote?.[k];
      if (isNullish(lv) && isNullish(rv)) return false;
      return !valuesEqualForDiff(lv, rv);
    })
    .sort();
}

function fieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isUpdatedAtFieldKey(key: string): boolean {
  return key === 'updatedAt' || key === 'updated_at';
}

/** US-style date + 24h time for sync timestamps (local); returns null if not parseable. */
function formatUpdatedAtDisplay(value: unknown): string | null {
  let d: Date;
  if (typeof value === 'number' && Number.isFinite(value)) {
    d = new Date(value);
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const t = Date.parse(trimmed);
    if (Number.isNaN(t)) return null;
    d = new Date(t);
  } else {
    return null;
  }
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${mm}/${dd}/${yy} ${hh}:${mi}:${ss}`;
}

function formatDisplayValue(fieldKey: string, value: unknown): ReactNode {
  if (value === undefined || value === null) {
    return <span className='text-muted-foreground'>—</span>;
  }
  if (isUpdatedAtFieldKey(fieldKey)) {
    const formatted = formatUpdatedAtDisplay(value);
    if (formatted) {
      return <span>{formatted}</span>;
    }
  }
  let displayed: unknown = value;
  if (typeof displayed === 'string') {
    displayed = tryParseJsonString(displayed);
  }
  if (displayed === null) {
    return <span className='text-muted-foreground'>null</span>;
  }
  if (typeof displayed === 'boolean' || typeof displayed === 'number') {
    return <span>{String(displayed)}</span>;
  }
  if (typeof displayed === 'string') {
    return <span className='break-words'>{displayed}</span>;
  }
  if (Array.isArray(displayed) || typeof displayed === 'object') {
    return (
      <pre className='mt-0.5 max-w-full font-mono text-[11px] whitespace-pre-wrap break-all'>
        {JSON.stringify(displayed, null, 2)}
      </pre>
    );
  }
  return String(displayed);
}

function ConflictSnapshotDiff({
  diffKeys,
  snapshot,
  isDeleteRemote,
  remoteDeletedAt,
}: {
  diffKeys: string[];
  snapshot: Record<string, unknown> | null;
  isDeleteRemote?: boolean;
  remoteDeletedAt?: string;
}) {
  return (
    <div className='space-y-3 p-2 text-xs'>
      {isDeleteRemote ? (
        <p className='text-muted-foreground'>
          Removed (tombstone).{' '}
          <span className='text-foreground'>deleted_at:</span>{' '}
          {remoteDeletedAt ?? '—'}
        </p>
      ) : null}
      {diffKeys.length === 0 ? (
        <p className='text-muted-foreground'>No differing fields.</p>
      ) : (
        diffKeys.map((key) => (
          <div
            key={key}
            className='border-border/60 border-b pb-2 last:border-b-0 last:pb-0'>
            <div className='text-foreground font-medium'>{fieldLabel(key)}</div>
            <div className='text-muted-foreground mt-1'>
              {formatDisplayValue(key, snapshot?.[key])}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

interface CloudSyncConflictResolveDialogProps {
  db: DB;
  conflict: SyncMergeConflict | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: (conflictId: string) => void;
}

export function CloudSyncConflictResolveDialog({
  db,
  conflict,
  open,
  onOpenChange,
  onResolved,
}: CloudSyncConflictResolveDialogProps) {
  const [mergedText, setMergedText] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !conflict) return;
    const base =
      (conflict.remoteSnapshot as Record<string, unknown> | null) ??
      (conflict.localSnapshot as Record<string, unknown> | null) ??
      {};
    setMergedText(JSON.stringify(base, null, 2));
    setLocalError(null);
  }, [open, conflict]);

  if (!conflict) return null;

  const typeLabel = getSyncEntityTypeLabelOne(conflict.tableName);
  const displayName =
    pickOptionalRowDisplayName(
      (conflict.localSnapshot ?? conflict.remoteSnapshot ?? {}) as Record<string, unknown>,
    ) ?? conflict.entityId.slice(0, 8);

  const run = async (resolution: 'local' | 'remote' | 'merged') => {
    setBusy(true);
    setLocalError(null);
    let merged: Record<string, unknown> | undefined;
    if (resolution === 'merged') {
      try {
        merged = JSON.parse(mergedText) as Record<string, unknown>;
      } catch {
        setLocalError('Merged row is not valid JSON.');
        setBusy(false);
        return;
      }
    }
    const outcome = await resolveSyncMergeConflict(db, conflict.id, resolution, merged);
    setBusy(false);
    if (outcome.error) {
      useSyncStateStore.getState().setSyncError(outcome.error);
      setLocalError(outcome.error);
      return;
    }
    onResolved(conflict.id);
    onOpenChange(false);
  };

  const isDelete = conflict.kind === 'delete';
  const diffKeys = getDiffingKeys(
    conflict.localSnapshot as Record<string, unknown> | null,
    conflict.remoteSnapshot as Record<string, unknown> | null,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='max-h-[90dvh] gap-4 sm:max-w-3xl'
        data-testid='cloud-sync-conflict-resolve-dialog'>
        <DialogHeader>
          <DialogTitle>Resolve sync conflict</DialogTitle>
          <DialogDescription>
            {isDelete
              ? 'Cloud removed this record while you still have local changes. Choose which version to keep.'
              : 'This record changed both on this device and in the cloud since the last sync. Choose which version to keep or edit the merged row.'}
          </DialogDescription>
        </DialogHeader>

        <div className='text-sm'>
          <span className='text-muted-foreground'>{typeLabel}</span>
          <span className='text-foreground font-medium'> · {displayName}</span>
          {isDelete ? <span className='text-muted-foreground ml-2'>(delete vs edit)</span> : null}
        </div>

        <Tabs defaultValue='compare' className='min-h-0 w-full flex-1'>
          <TabsList>
            <TabsTrigger value='compare'>Compare</TabsTrigger>
            <TabsTrigger value='merge'>Edit merged</TabsTrigger>
          </TabsList>
          <TabsContent value='compare' className='mt-3 min-h-0'>
            <div className='grid max-h-[min(50dvh,20rem)] grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='flex min-h-0 min-w-0 flex-col gap-1'>
                <Button
                  type='button'
                  variant='ghost'
                  className='text-muted-foreground hover:text-foreground h-auto justify-start p-0 text-xs font-medium tracking-wide'
                  onClick={() => void run('local')}
                  disabled={busy || (isDelete && !conflict.localSnapshot)}>
                  Use Local
                </Button>
                <ScrollArea className='border-border h-[300px] rounded-md border'>
                  <ConflictSnapshotDiff
                    diffKeys={diffKeys}
                    snapshot={conflict.localSnapshot as Record<string, unknown> | null}
                  />
                </ScrollArea>
              </div>
              <div className='flex min-h-0 min-w-0 flex-col gap-1'>
                <Button
                  type='button'
                  variant='ghost'
                  className='text-muted-foreground hover:text-foreground h-auto justify-start p-0 text-xs font-medium tracking-wide'
                  onClick={() => void run('remote')}
                  disabled={busy}>
                  Use Remote
                </Button>
                <ScrollArea className='border-border h-[300px] rounded-md border'>
                  <ConflictSnapshotDiff
                    diffKeys={diffKeys}
                    snapshot={conflict.remoteSnapshot as Record<string, unknown> | null}
                    isDeleteRemote={isDelete}
                    remoteDeletedAt={conflict.remoteDeletedAt}
                  />
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
          <TabsContent value='merge' className='mt-3'>
            <Textarea
              className='font-mono text-xs h-[300px]'
              value={mergedText}
              onChange={(e) => setMergedText(e.target.value)}
              spellCheck={false}
            />
            <p className='text-muted-foreground mt-2 text-xs'>
              Whole-row JSON in Dexie shape (camelCase). The row id must stay{' '}
              <code className='text-foreground'>{conflict.entityId}</code>.
            </p>
          </TabsContent>
        </Tabs>

        {localError ? (
          <p className='text-destructive text-sm' role='alert'>
            {localError}
          </p>
        ) : null}

        <DialogFooter className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={busy}>
            Cancel
          </Button>
          <Button type='button' onClick={() => void run('merged')} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className='mr-2 size-4 animate-spin' />
                Applying…
              </>
            ) : (
              'Apply merged row'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
