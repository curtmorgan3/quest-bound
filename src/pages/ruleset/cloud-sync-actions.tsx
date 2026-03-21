/**
 * Cloud sync actions for the ruleset page: "Push to Cloud" (first push) and "Sync Now".
 * Only visible when cloud is configured and user is authenticated.
 */

import { isCloudConfigured } from '@/lib/cloud/client';
import { pushToCloudAndMarkSynced, syncRuleset } from '@/lib/cloud/sync/sync-service';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import { Cloud, Loader2, RefreshCw } from 'lucide-react';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { toast } from 'sonner';
import { db } from '@/stores';
import type { DB } from '@/stores/db/hooks/types';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components';

export interface CloudSyncActionsRef {
  openPushDialog: () => void;
}

interface CloudSyncActionsProps {
  rulesetId: string;
}

export const CloudSyncActions = forwardRef<CloudSyncActionsRef, CloudSyncActionsProps>(
  function CloudSyncActions({ rulesetId }, ref) {
    const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
    const cloudSyncEnabled = useCloudAuthStore((s) => s.cloudSyncEnabled);
    const cloudSyncEligibilityLoading = useCloudAuthStore((s) => s.isCloudSyncEligibilityLoading);
    const { isCloudSynced, isSyncing, syncError } = useSyncStateStore();
    const [pushConfirmOpen, setPushConfirmOpen] = useState(false);
    const [pushInProgress, setPushInProgress] = useState(false);

    useImperativeHandle(ref, () => ({
      openPushDialog: () => setPushConfirmOpen(true),
    }));

  if (
    !isCloudConfigured ||
    !isAuthenticated ||
    !cloudSyncEnabled ||
    cloudSyncEligibilityLoading
  ) {
    return null;
  }

  const synced = isCloudSynced(rulesetId);
  const busy = isSyncing || pushInProgress;

  const handleSyncNow = async () => {
    if (busy) return;
    const result = await syncRuleset(rulesetId, db as DB);
    if (!result.error) toast.success('Synced to Quest Bound Cloud');
  };

  const handlePushConfirm = async () => {
    setPushInProgress(true);
    try {
      const result = await pushToCloudAndMarkSynced(rulesetId, db as DB);
      if (!result.error) {
        setPushConfirmOpen(false);
        toast.success('Synced to Quest Bound Cloud');
      }
    } finally {
      setPushInProgress(false);
    }
  };

  if (synced) {
    return (
      <Button
        variant='outline'
        size='sm'
        onClick={handleSyncNow}
        disabled={busy || !navigator.onLine}
        title={syncError ?? (navigator.onLine ? 'Sync now with Quest Bound Cloud' : 'Offline')}
        data-testid='sync-now-button'>
        {busy ? (
          <Loader2 className='h-4 w-4 animate-spin' />
        ) : (
          <RefreshCw className='h-4 w-4' />
        )}
        Sync now
      </Button>
    );
  }

  return (
    <>
      <Button
        variant='outline'
        size='sm'
        onClick={() => setPushConfirmOpen(true)}
        disabled={busy || !navigator.onLine}
        title={navigator.onLine ? 'Upload this ruleset to Quest Bound Cloud' : 'Offline'}
        data-testid='push-to-cloud-button'>
        <Cloud className='h-4 w-4' />
        Push to Cloud
      </Button>
      <AlertDialog open={pushConfirmOpen} onOpenChange={setPushConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Push to Quest Bound Cloud</AlertDialogTitle>
            <AlertDialogDescription>
              This will upload your ruleset to Quest Bound Cloud so you can access it on other
              devices. You can sync changes anytime after this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pushInProgress}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handlePushConfirm();
              }}
              disabled={pushInProgress}>
              {pushInProgress ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Uploading…
                </>
              ) : (
                'Push to Cloud'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
  },
);
