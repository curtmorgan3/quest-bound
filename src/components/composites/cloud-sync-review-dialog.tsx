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
import { getOrderedSyncEntityLines } from '@/lib/cloud/sync/sync-entity-labels';
import { db, useCloudSyncReviewStore } from '@/stores';
import type { DB } from '@/stores/db/hooks/types';
import { Loader2 } from 'lucide-react';

function EntityList({
  counts,
  emptyLabel,
}: {
  counts: Record<string, number>;
  emptyLabel: string;
}) {
  const lines = getOrderedSyncEntityLines(counts);
  if (lines.length === 0) {
    return <p className='text-muted-foreground text-sm'>{emptyLabel}</p>;
  }
  return (
    <ul className='text-sm'>
      {lines.map((line) => (
        <li key={line.tableName} className='py-0.5'>
          {line.phrase}
        </li>
      ))}
    </ul>
  );
}

export function CloudSyncReviewDialog() {
  const open = useCloudSyncReviewStore((s) => s.open);
  const plan = useCloudSyncReviewStore((s) => s.plan);
  const committing = useCloudSyncReviewStore((s) => s.committing);
  const cancel = useCloudSyncReviewStore((s) => s.cancel);
  const confirm = useCloudSyncReviewStore((s) => s.confirm);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !committing) cancel();
      }}>
      <DialogContent
        className='max-h-[85dvh] gap-4 sm:max-w-2xl'
        data-testid='cloud-sync-review-dialog'>
        <DialogHeader>
          <DialogTitle>Review Sync</DialogTitle>
          <DialogDescription>
            Apply cloud updates locally, then push your outgoing changes. Asset files download when
            you confirm.
          </DialogDescription>
        </DialogHeader>
        {plan ? (
          <ScrollArea className='max-h-[min(50dvh,22rem)] pr-3'>
            <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6'>
              <div className='min-w-0'>
                <div className='text-foreground mb-2 text-sm font-medium tracking-wide'>
                  Pull from Cloud
                </div>
                <EntityList counts={plan.pulledByEntity} emptyLabel='No incoming changes' />
              </div>
              <div className='min-w-0'>
                <div className='text-foreground mb-2 text-sm font-medium tracking-wide'>
                  Push to Cloud
                </div>
                <EntityList counts={plan.pushedByEntity} emptyLabel='Nothing to push' />
              </div>
            </div>
          </ScrollArea>
        ) : null}
        <DialogFooter className='gap-2'>
          <Button type='button' variant='outline' onClick={cancel} disabled={committing}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={() => void confirm(db as DB)}
            disabled={committing || !plan}>
            {committing ? (
              <>
                <Loader2 className='mr-2 size-4 animate-spin' />
                Syncing…
              </>
            ) : (
              'Confirm Sync'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
