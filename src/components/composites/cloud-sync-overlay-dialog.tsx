import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import { cn } from '@/lib/utils';
import { useCloudSyncReviewStore } from '@/stores';
import { AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Backdrop while cloud sync plans or applies changes (after review confirm). */
export function CloudSyncOverlayDialog() {
  const open = useSyncStateStore((s) => s.cloudSyncOverlayOpen);
  const syncError = useSyncStateStore((s) => s.syncError);
  const setSyncError = useSyncStateStore((s) => s.setSyncError);
  const setCloudSyncOverlayOpen = useSyncStateStore((s) => s.setCloudSyncOverlayOpen);
  const planning = useCloudSyncReviewStore((s) => s.planning);

  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (syncError) setDetailsOpen(false);
  }, [syncError]);

  const dismissError = () => {
    setSyncError(null);
    setCloudSyncOverlayOpen(false);
  };

  const blocking = open && !syncError;
  const title = syncError
    ? "Sync couldn't finish"
    : planning
      ? 'Checking for changes…'
      : 'Syncing with Quest Bound Cloud';
  const description = syncError
    ? 'Something went wrong while talking to Quest Bound Cloud. You can open technical details below.'
    : planning
      ? 'Comparing your ruleset with Quest Bound Cloud.'
      : 'Please keep this tab open until sync finishes.';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && syncError) dismissError();
      }}>
      <DialogContent
        showCloseButton={!!syncError}
        overlayClassName='z-[200] bg-black/50'
        className='z-[210] gap-6 sm:max-w-md'
        onPointerDownOutside={(e) => {
          if (blocking) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (blocking) e.preventDefault();
        }}
        aria-busy={blocking || undefined}
        data-testid='cloud-sync-overlay-dialog'>
        <DialogHeader className='items-center text-center sm:text-center'>
          <div className='flex justify-center' aria-hidden>
            {syncError ? (
              <AlertCircle className='text-destructive size-10' />
            ) : (
              <Loader2 className='text-muted-foreground size-10 animate-spin' />
            )}
          </div>
          <DialogTitle className='text-base'>{title}</DialogTitle>
          <DialogDescription className='text-center'>{description}</DialogDescription>
        </DialogHeader>

        {syncError ? (
          <>
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  className='flex w-full items-center justify-between gap-2'
                  aria-expanded={detailsOpen}
                  data-testid='cloud-sync-error-details-trigger'>
                  <span className='text-sm font-medium'>Technical details</span>
                  <ChevronDown
                    className={cn('size-4 shrink-0 transition-transform', detailsOpen && 'rotate-180')}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre
                  className='bg-muted/80 text-muted-foreground mt-2 max-h-[min(40dvh,14rem)] overflow-auto rounded-md border p-3 text-left text-xs break-words whitespace-pre-wrap'
                  data-testid='cloud-sync-error-details'>
                  {syncError}
                </pre>
              </CollapsibleContent>
            </Collapsible>
            <DialogFooter className='sm:justify-center'>
              <Button type='button' onClick={dismissError} data-testid='cloud-sync-error-dismiss'>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
