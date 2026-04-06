import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  pullEntireRulesetFromCloud,
  pushEntireRulesetToCloud,
} from '@/lib/cloud/sync/sync-service';
import { db, useCloudSyncReviewStore, useCloudSyncSummaryPanelStore } from '@/stores';
import type { DB } from '@/stores/db/hooks/types';
import { CloudDownload, CloudUpload, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';

export interface CloudSyncMenuDialogsProps {
  rulesetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  isOffline: boolean;
}

type ConfirmKind = 'push' | 'pull' | 'sync' | null;

export function CloudSyncMenuDialogs({
  rulesetId,
  open,
  onOpenChange,
  busy,
  isOffline,
}: CloudSyncMenuDialogsProps) {
  const startReview = useCloudSyncReviewStore((s) => s.startReview);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const openConfirm = useCallback(
    (kind: Exclude<ConfirmKind, null>) => {
      onOpenChange(false);
      queueMicrotask(() => setConfirm(kind));
    },
    [onOpenChange],
  );

  const closeConfirm = useCallback(() => setConfirm(null), []);

  const handlePushConfirm = async () => {
    setPushing(true);
    try {
      const result = await pushEntireRulesetToCloud(rulesetId, db as DB);
      if (!result.error) {
        closeConfirm();
        useCloudSyncSummaryPanelStore.getState().showSummary(result);
      }
    } finally {
      setPushing(false);
    }
  };

  const handlePullConfirm = async () => {
    setPulling(true);
    try {
      const result = await pullEntireRulesetFromCloud(rulesetId, db as DB);
      if (!result.error) {
        closeConfirm();
        useCloudSyncSummaryPanelStore.getState().showSummary(result);
      }
    } finally {
      setPulling(false);
    }
  };

  const handleSyncConfirm = async () => {
    setSyncing(true);
    try {
      await startReview(rulesetId, db as DB);
    } finally {
      setSyncing(false);
      closeConfirm();
    }
  };

  const actionBusy = pushing || pulling || syncing;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='gap-3 sm:max-w-sm' showCloseButton>
          <DialogHeader>
            <DialogTitle>Quest Bound Cloud</DialogTitle>
            <DialogDescription>Choose how to sync this ruleset.</DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-2'>
            <Button
              type='button'
              variant='outline'
              className='w-full justify-start gap-2'
              disabled={busy || isOffline}
              onClick={() => openConfirm('push')}
              data-testid='cloud-sync-menu-push'>
              <CloudUpload className='h-4 w-4 shrink-0' />
              Push to Cloud
            </Button>
            <Button
              type='button'
              variant='outline'
              className='w-full justify-start gap-2'
              disabled={busy || isOffline}
              onClick={() => openConfirm('pull')}
              data-testid='cloud-sync-menu-pull'>
              <CloudDownload className='h-4 w-4 shrink-0' />
              Pull from Cloud
            </Button>
            <Button
              type='button'
              variant='outline'
              className='w-full justify-start gap-2'
              disabled={busy || isOffline}
              onClick={() => openConfirm('sync')}
              data-testid='cloud-sync-menu-sync'>
              <RefreshCw className='h-4 w-4 shrink-0' />
              Sync
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm === 'push'} onOpenChange={(v) => !v && closeConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Push entire ruleset to the cloud?</AlertDialogTitle>
            <AlertDialogDescription>
              This uploads your full local ruleset and overwrites matching data in Quest Bound
              Cloud. Other devices will see this copy after they sync.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handlePushConfirm();
              }}
              disabled={actionBusy}>
              {pushing ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Pushing…
                </>
              ) : (
                'Push to Cloud'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm === 'pull'} onOpenChange={(v) => !v && closeConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this device with the cloud copy?</AlertDialogTitle>
            <AlertDialogDescription>
              This downloads the ruleset from Quest Bound Cloud and overwrites local changes on this
              device with the cloud version. Unsaved local edits that are not on the server will be
              lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handlePullConfirm();
              }}
              disabled={actionBusy}>
              {pulling ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Pulling…
                </>
              ) : (
                'Pull from Cloud'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm === 'sync'} onOpenChange={(v) => !v && closeConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync with Quest Bound Cloud?</AlertDialogTitle>
            <AlertDialogDescription>
              This merges local and cloud changes, saving the merged copy locally and on the server.
              You may review incoming updates or resolve merge conflicts before changes are applied.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleSyncConfirm();
              }}
              disabled={actionBusy}>
              {syncing ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Starting…
                </>
              ) : (
                'Sync'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
