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
import { useEffect, useState } from 'react';

function jsonPreview(obj: Record<string, unknown> | null): string {
  if (!obj) return '—';
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '—';
  }
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
                <div className='text-muted-foreground text-xs font-medium tracking-wide'>Local</div>
                <ScrollArea className='border-border rounded-md border h-[300px]'>
                  <pre className='text-xs break-all whitespace-pre-wrap p-2'>
                    {jsonPreview(conflict.localSnapshot as Record<string, unknown> | null)}
                  </pre>
                </ScrollArea>
              </div>
              <div className='flex min-h-0 min-w-0 flex-col gap-1'>
                <div className='text-muted-foreground text-xs font-medium tracking-wide'>
                  {isDelete ? 'Cloud' : 'Remote'}
                </div>
                <ScrollArea className='border-border rounded-md border h-[300px]'>
                  <pre className='text-xs break-all whitespace-pre-wrap p-2'>
                    {isDelete
                      ? `Removed (tombstone)\ndeleted_at: ${conflict.remoteDeletedAt ?? '—'}`
                      : jsonPreview(conflict.remoteSnapshot as Record<string, unknown> | null)}
                  </pre>
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
          <Button
            type='button'
            variant='secondary'
            onClick={() => void run('local')}
            disabled={busy || (isDelete && !conflict.localSnapshot)}>
            Use local
          </Button>
          <Button
            type='button'
            variant='secondary'
            onClick={() => void run('remote')}
            disabled={busy}>
            Use remote
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
