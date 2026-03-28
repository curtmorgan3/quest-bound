import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import { useCloudSyncReviewStore } from '@/stores';
import { Loader2 } from 'lucide-react';

/** Backdrop while cloud sync plans or applies changes (after review confirm). */
export function CloudSyncOverlayDialog() {
  const open = useSyncStateStore((s) => s.cloudSyncOverlayOpen);
  const planning = useCloudSyncReviewStore((s) => s.planning);
  const title = planning ? 'Checking for changes…' : 'Syncing with Quest Bound Cloud';
  const description = planning
    ? 'Comparing your ruleset with Quest Bound Cloud.'
    : 'Please keep this tab open until sync finishes.';

  return (
    <Dialog open={open} modal>
      <DialogContent
        showCloseButton={false}
        overlayClassName='z-[200] bg-black/50'
        className='z-[210] gap-6 sm:max-w-md'
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-busy
        data-testid='cloud-sync-overlay-dialog'>
        <DialogHeader className='items-center text-center sm:text-center'>
          <div className='flex justify-center' aria-hidden>
            <Loader2 className='text-muted-foreground size-10 animate-spin' />
          </div>
          <DialogTitle className='text-base'>{title}</DialogTitle>
          <DialogDescription className='text-center'>{description}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
