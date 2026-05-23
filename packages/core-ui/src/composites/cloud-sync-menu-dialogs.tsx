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
  deleteRulesetBackup,
  downloadRulesetBackup,
  hasRulesetBackup,
  uploadRulesetBackup,
} from '@/lib/cloud/backup/cloud-backup-service';
import { useActiveRuleset } from '@/lib/compass-api';
import { useExportRuleset } from '@/lib/compass-api/hooks/export/use-export-ruleset';
import { useImportRuleset } from '@/lib/compass-api/hooks/export/use-import-ruleset';
import { CloudDownload, CloudUpload, Loader2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface CloudSyncMenuDialogsProps {
  rulesetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  isOffline: boolean;
}

type ConfirmKind = 'push' | 'pull' | 'deleteCloud' | null;

export function CloudSyncMenuDialogs({
  rulesetId,
  open,
  onOpenChange,
  busy,
  isOffline,
}: CloudSyncMenuDialogsProps) {
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [deletingFromCloud, setDeletingFromCloud] = useState(false);
  const [deleteFromCloudError, setDeleteFromCloudError] = useState<string | null>(null);
  const [hasBackup, setHasBackup] = useState(false);

  const { activeRuleset } = useActiveRuleset();
  const { exportRuleset } = useExportRuleset(rulesetId);
  const { importRuleset } = useImportRuleset();

  const loadHasBackup = useCallback(async () => {
    const result = await hasRulesetBackup(rulesetId);
    setHasBackup(result);
  }, [rulesetId]);

  const openConfirm = useCallback(
    (kind: Exclude<ConfirmKind, null>) => {
      onOpenChange(false);
      queueMicrotask(() => setConfirm(kind));
    },
    [onOpenChange],
  );

  const closeConfirm = useCallback(() => setConfirm(null), []);

  useEffect(() => {
    if (open) void loadHasBackup();
  }, [open, loadHasBackup]);

  const handlePushConfirm = async () => {
    setPushing(true);
    try {
      const blob = await exportRuleset({ returnBlob: true });
      if (!(blob instanceof Blob)) {
        toast.error('Export failed');
        return;
      }
      const { error } = await uploadRulesetBackup(rulesetId, blob, {
        title: activeRuleset?.title ?? '',
        version: activeRuleset?.version ?? '',
        isModule: activeRuleset?.isModule ?? false,
      });
      if (error) {
        toast.error(`Upload failed: ${error}`);
        return;
      }
      setHasBackup(true);
      closeConfirm();
      toast.success('Ruleset backed up to the cloud');
    } finally {
      setPushing(false);
    }
  };

  const handlePullConfirm = async () => {
    setPulling(true);
    try {
      const { blob, error } = await downloadRulesetBackup(rulesetId);
      if (error || !blob) {
        toast.error(`Download failed: ${error ?? 'No backup found'}`);
        return;
      }
      const file = new File([blob], 'cloud-backup.zip', { type: 'application/zip' });
      const result = await importRuleset(file, { forceReplace: true });
      if (!result.success) {
        toast.error(`Import failed: ${result.message}`);
        return;
      }
      closeConfirm();
      toast.success('Ruleset restored from cloud backup');
    } finally {
      setPulling(false);
    }
  };

  const handleDeleteFromCloudConfirm = async () => {
    setDeleteFromCloudError(null);
    setDeletingFromCloud(true);
    try {
      const { error } = await deleteRulesetBackup(rulesetId);
      if (error) {
        setDeleteFromCloudError(error);
        return;
      }
      setHasBackup(false);
      closeConfirm();
    } finally {
      setDeletingFromCloud(false);
    }
  };

  const actionBusy = pushing || pulling;
  const pullDeleteDisabled = busy || isOffline || !hasBackup;
  const notOnCloudTitle = 'Push this ruleset to the cloud first';

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
              disabled={pullDeleteDisabled}
              title={!hasBackup ? notOnCloudTitle : undefined}
              onClick={() => openConfirm('pull')}
              data-testid='cloud-sync-menu-pull'>
              <CloudDownload className='h-4 w-4 shrink-0' />
              Pull from Cloud
            </Button>
            <Button
              type='button'
              variant='outline'
              className='w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive'
              disabled={pullDeleteDisabled}
              title={!hasBackup ? notOnCloudTitle : undefined}
              onClick={() => {
                setDeleteFromCloudError(null);
                openConfirm('deleteCloud');
              }}
              data-testid='cloud-sync-menu-delete-from-cloud'>
              <Trash2 className='h-4 w-4 shrink-0' />
              Delete from Cloud
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm === 'push'} onOpenChange={(v) => !v && closeConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Push entire ruleset to the cloud?</AlertDialogTitle>
            <AlertDialogDescription>
              This exports your full local ruleset and uploads it to Quest Bound Cloud, replacing any
              existing cloud backup. Other devices can pull this copy to get the latest version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handlePushConfirm();
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
              This downloads the cloud backup and overwrites your local copy of this ruleset.
              Unsaved local changes that are not in the cloud backup will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handlePullConfirm();
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

      <AlertDialog
        open={confirm === 'deleteCloud'}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteFromCloudError(null);
            closeConfirm();
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this ruleset from Quest Bound Cloud?</AlertDialogTitle>
            <AlertDialogDescription className='space-y-2'>
              <span className='block'>
                This removes the cloud backup for this ruleset. Your local copy on this device is
                not deleted.
              </span>
              <span className='block font-medium text-destructive'>This cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteFromCloudError ? (
            <p className='text-sm text-destructive' role='alert'>
              {deleteFromCloudError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingFromCloud}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteFromCloudConfirm();
              }}
              disabled={deletingFromCloud}>
              {deletingFromCloud ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Deleting…
                </>
              ) : (
                'Delete from Cloud'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
