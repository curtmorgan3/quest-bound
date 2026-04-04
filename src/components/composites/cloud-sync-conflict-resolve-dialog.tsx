import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useEffect, useMemo, useState, type ReactNode } from 'react';

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

type FieldEditorKind = 'string' | 'number' | 'boolean' | 'json';

function classifyMergedFieldValue(value: unknown): FieldEditorKind {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  if (value === null || value === undefined) return 'string';
  if (typeof value === 'string') {
    const parsed = tryParseJsonString(value);
    if (
      parsed !== value &&
      (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null))
    ) {
      return 'json';
    }
    return 'string';
  }
  if (Array.isArray(value) || typeof value === 'object') return 'json';
  return 'string';
}

function formatJsonForDraft(value: unknown): string {
  const v = typeof value === 'string' ? tryParseJsonString(value) : value;
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(
      v ?? null,
      (_key, x) => (typeof x === 'bigint' ? x.toString() : x),
      2,
    );
  } catch {
    return '{}';
  }
}

/**
 * Apply JSON field from merge UI. Only string drafts are passed to JSON.parse — calling
 * JSON.parse on an object coerces to "[object Object]" and throws a confusing SyntaxError.
 */
function parsedValueFromMergeJsonDraft(
  draft: unknown,
  currentRowValue: unknown,
): { ok: true; value: unknown } | { ok: false } {
  if (draft === undefined) {
    return { ok: true, value: currentRowValue };
  }
  if (typeof draft !== 'string') {
    return { ok: true, value: draft };
  }
  const trimmed = draft.trim();
  if (trimmed === '') {
    return { ok: false };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown };
  } catch {
    return { ok: false };
  }
}

/**
 * Many Dexie tables store JSON payloads as strings (e.g. `data`, `style`). The merge editor
 * uses parsed values; if either snapshot still had this key as a string, write back a string.
 * (Remote may deserialize to object while local remains a string — prefer string for Dexie.)
 */
function jsonFieldStoredAsStringInEitherSnapshot(
  local: Record<string, unknown> | null,
  remote: Record<string, unknown> | null,
  key: string,
): boolean {
  return typeof local?.[key] === 'string' || typeof remote?.[key] === 'string';
}

function coerceJsonFieldForDexie(next: unknown, storedAsString: boolean): unknown {
  if (!storedAsString) {
    return next;
  }
  if (typeof next === 'string') {
    return next;
  }
  if (next === undefined) {
    return undefined;
  }
  try {
    return JSON.stringify(next, (_key, x) => (typeof x === 'bigint' ? x.toString() : x));
  } catch {
    return next;
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
    deepEqual((a as Record<string, unknown>)[k!], (b as Record<string, unknown>)[k!]),
  );
}

function valuesEqualForDiff(a: unknown, b: unknown): boolean {
  return deepEqual(normalizeDeep(a), normalizeDeep(b));
}

function isNullish(value: unknown): boolean {
  return value === null || value === undefined;
}

function isUpdatedAtFieldKey(key: string): boolean {
  return key === 'updatedAt' || key === 'updated_at';
}

function getDiffingKeys(
  local: Record<string, unknown> | null,
  remote: Record<string, unknown> | null,
): string[] {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  return [...keys]
    .filter((k) => {
      const lv = local?.[k];
      const rv = remote?.[k];
      if (isNullish(lv) && isNullish(rv)) return false;
      return !valuesEqualForDiff(lv, rv);
    })
    .sort();
}

/** Diff keys shown in Edit merged (excludes timestamps managed on apply). */
function getMergeDiffingKeys(
  local: Record<string, unknown> | null,
  remote: Record<string, unknown> | null,
): string[] {
  return getDiffingKeys(local, remote).filter((k) => !isUpdatedAtFieldKey(k));
}

function fieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
          Removed (tombstone). <span className='text-foreground'>deleted_at:</span>{' '}
          {remoteDeletedAt ?? '—'}
        </p>
      ) : null}
      {diffKeys.length === 0 ? (
        <p className='text-muted-foreground'>No differing fields.</p>
      ) : (
        diffKeys.map((key) => (
          <div key={key} className='border-border/60 border-b pb-2 last:border-b-0 last:pb-0'>
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
  const [mergedRow, setMergedRow] = useState<Record<string, unknown>>({});
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<'compare' | 'merge'>('compare');

  useEffect(() => {
    if (!open || !conflict) return;
    setMainTab('compare');
    const base =
      (conflict.remoteSnapshot as Record<string, unknown> | null) ??
      (conflict.localSnapshot as Record<string, unknown> | null) ??
      {};
    const clean = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
    setMergedRow(clean);
    const keys = getMergeDiffingKeys(
      conflict.localSnapshot as Record<string, unknown> | null,
      conflict.remoteSnapshot as Record<string, unknown> | null,
    );
    const drafts: Record<string, string> = {};
    for (const k of keys) {
      if (classifyMergedFieldValue(clean[k]) === 'json') {
        drafts[k] = formatJsonForDraft(clean[k]);
      }
    }
    setJsonDrafts(drafts);
    setLocalError(null);
  }, [open, conflict]);

  const diffKeys = useMemo(() => {
    if (!conflict) return [] as string[];
    return getDiffingKeys(
      conflict.localSnapshot as Record<string, unknown> | null,
      conflict.remoteSnapshot as Record<string, unknown> | null,
    );
  }, [conflict]);

  const mergeDiffKeys = useMemo(() => diffKeys.filter((k) => !isUpdatedAtFieldKey(k)), [diffKeys]);

  const mergeFieldKinds = useMemo(() => {
    if (!conflict) return {} as Record<string, FieldEditorKind>;
    const base =
      (conflict.remoteSnapshot as Record<string, unknown> | null) ??
      (conflict.localSnapshot as Record<string, unknown> | null) ??
      {};
    const out: Record<string, FieldEditorKind> = {};
    for (const k of mergeDiffKeys) {
      out[k] = classifyMergedFieldValue(base[k]);
    }
    return out;
  }, [conflict, mergeDiffKeys]);

  if (!conflict) return null;

  const typeLabel = getSyncEntityTypeLabelOne(conflict.tableName);
  const displayName =
    pickOptionalRowDisplayName(
      (conflict.localSnapshot ?? conflict.remoteSnapshot ?? {}) as Record<string, unknown>,
    ) ?? conflict.entityId.slice(0, 8);

  const isDelete = conflict.kind === 'delete';

  const run = async (resolution: 'local' | 'remote' | 'merged') => {
    setBusy(true);
    setLocalError(null);
    let merged: Record<string, unknown> | undefined;
    if (resolution === 'merged') {
      const localSnap = conflict.localSnapshot as Record<string, unknown> | null;
      const remoteSnap = conflict.remoteSnapshot as Record<string, unknown> | null;
      const row = JSON.parse(JSON.stringify(mergedRow)) as Record<string, unknown>;
      for (const k of mergeDiffKeys) {
        const kind = mergeFieldKinds[k] ?? 'string';
        if (kind === 'json') {
          const parsed = parsedValueFromMergeJsonDraft(jsonDrafts[k], row[k]);
          if (!parsed.ok) {
            setLocalError(`"${fieldLabel(k)}" is not valid JSON.`);
            setBusy(false);
            return;
          }
          const asString = jsonFieldStoredAsStringInEitherSnapshot(localSnap, remoteSnap, k);
          row[k] = coerceJsonFieldForDexie(parsed.value, asString);
        }
        if (kind === 'number') {
          const v = row[k];
          if (v === null || v === undefined || v === '') {
            setLocalError(`"${fieldLabel(k)}" must be a number.`);
            setBusy(false);
            return;
          }
          const n = typeof v === 'number' ? v : Number(String(v).trim());
          if (Number.isNaN(n)) {
            setLocalError(`"${fieldLabel(k)}" must be a number.`);
            setBusy(false);
            return;
          }
          row[k] = n;
        }
      }
      row.updatedAt = new Date().toISOString();
      merged = row;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='max-h-[90dvh] gap-4 sm:max-w-3xl'
        data-testid='cloud-sync-conflict-resolve-dialog'>
        <DialogHeader>
          <DialogTitle>Resolve Sync Conflict</DialogTitle>
          <DialogDescription>
            {isDelete
              ? 'This record was removed from the cloud while you still have local changes. Choose which version to keep.'
              : 'This record changed both on this device and in the cloud since the last sync. Choose which version to keep or edit the merged row.'}
          </DialogDescription>
        </DialogHeader>

        <div className='text-sm'>
          <span className='text-muted-foreground'>{typeLabel}</span>
          <span className='text-foreground font-medium'> · {displayName}</span>
          {isDelete ? <span className='text-muted-foreground ml-2'>(delete vs edit)</span> : null}
        </div>

        <Tabs
          value={mainTab}
          onValueChange={(v) => setMainTab(v as 'compare' | 'merge')}
          className='min-h-0 w-full flex-1'>
          <TabsList>
            <TabsTrigger value='compare'>Compare</TabsTrigger>
            <TabsTrigger value='merge'>Edit Merged</TabsTrigger>
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
            <ScrollArea className='border-border h-[300px] rounded-md border'>
              <div className='space-y-4 p-3'>
                {mergeDiffKeys.length === 0 ? (
                  <p className='text-muted-foreground text-xs'>No differing fields.</p>
                ) : (
                  mergeDiffKeys.map((key) => {
                    const kind = mergeFieldKinds[key] ?? 'string';
                    const id = `merge-field-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
                    return (
                      <div key={key} className='space-y-2'>
                        {kind === 'boolean' ? (
                          <div className='flex items-center gap-2'>
                            <Checkbox
                              id={id}
                              checked={Boolean(mergedRow[key])}
                              onCheckedChange={(state) =>
                                setMergedRow((prev) => ({
                                  ...prev,
                                  [key]: state === true,
                                }))
                              }
                            />
                            <Label htmlFor={id} className='cursor-pointer text-xs font-normal'>
                              {fieldLabel(key)}
                            </Label>
                          </div>
                        ) : (
                          <>
                            <Label htmlFor={id} className='text-xs'>
                              {fieldLabel(key)}
                            </Label>
                            {kind === 'number' ? (
                              <Input
                                id={id}
                                type='text'
                                inputMode='decimal'
                                className='font-mono text-xs'
                                value={
                                  mergedRow[key] === null || mergedRow[key] === undefined
                                    ? ''
                                    : String(mergedRow[key])
                                }
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw.trim() === '') {
                                    setMergedRow((prev) => ({
                                      ...prev,
                                      [key]: null,
                                    }));
                                    return;
                                  }
                                  const n = Number(raw.trim());
                                  if (!Number.isNaN(n)) {
                                    setMergedRow((prev) => ({
                                      ...prev,
                                      [key]: n,
                                    }));
                                  }
                                }}
                              />
                            ) : kind === 'json' ? (
                              <Textarea
                                id={id}
                                className='font-mono text-xs min-h-[120px]'
                                spellCheck={false}
                                value={
                                  typeof jsonDrafts[key] === 'string'
                                    ? jsonDrafts[key]
                                    : formatJsonForDraft(mergedRow[key])
                                }
                                onChange={(e) =>
                                  setJsonDrafts((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                              />
                            ) : (
                              <Input
                                id={id}
                                type='text'
                                className='font-mono text-xs'
                                value={
                                  mergedRow[key] === null || mergedRow[key] === undefined
                                    ? ''
                                    : String(mergedRow[key])
                                }
                                onChange={(e) =>
                                  setMergedRow((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                              />
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
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
          {mainTab === 'merge' ? (
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
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
