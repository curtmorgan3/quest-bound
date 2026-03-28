import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import { Loader2 } from 'lucide-react';

/** Centered modal with an opaque backdrop while Quest Bound Cloud pull/push runs. */
export function CloudSyncOverlayDialog() {
  const open = useSyncStateStore((s) => s.cloudSyncOverlayOpen);

  return (
    <Dialog open={open} modal>
      <DialogContent
        showCloseButton={false}
        overlayClassName='z-[200] bg-background/50'
        className='z-[210] gap-6 sm:max-w-md'
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-busy
        data-testid='cloud-sync-overlay-dialog'>
        <DialogHeader className='items-center text-center sm:text-center'>
          <div className='flex justify-center' aria-hidden>
            <Loader2 className='text-muted-foreground size-10 animate-spin' />
          </div>
          <DialogTitle className='text-base'>Syncing with Quest Bound Cloud</DialogTitle>
          <DialogDescription className='text-center'>
            Please keep this tab open until sync finishes.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
