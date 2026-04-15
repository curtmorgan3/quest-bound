/**
 * Cloud sync entry for the ruleset page: opens a menu with push, pull, and sync actions.
 */

import { Button, CloudSyncMenuDialogs } from '@/components';
import { isCloudConfigured } from '@/lib/cloud/client';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import { Cloud, Loader2 } from 'lucide-react';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useCloudSyncReviewStore, useExternalRulesetGrantStore } from '@/stores';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';

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
    const { isSyncing, syncError } = useSyncStateStore();
    const planning = useCloudSyncReviewStore((s) => s.planning);
    const committing = useCloudSyncReviewStore((s) => s.committing);
    const reviewOpen = useCloudSyncReviewStore((s) => s.open);
    const externalGrantBlocksRemoteSync = useExternalRulesetGrantStore((s) =>
      s.permissionByRulesetId[rulesetId] != null,
    );
    const [menuOpen, setMenuOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      openPushDialog: () => setMenuOpen(true),
    }));

    if (
      !isCloudConfigured ||
      !isAuthenticated ||
      !cloudSyncEnabled ||
      cloudSyncEligibilityLoading
    ) {
      return null;
    }

    if (externalGrantBlocksRemoteSync) {
      return null;
    }

    const busy = isSyncing || planning || committing || reviewOpen;
    const isOffline = !navigator.onLine;

    return (
      <>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setMenuOpen(true)}
          disabled={busy || isOffline}
          title={
            syncError ??
            (isOffline ? 'Offline' : 'Push, pull, or sync with Quest Bound Cloud')
          }
          data-testid='cloud-sync-menu-trigger'>
          {busy ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Cloud className='h-4 w-4' />
          )}
          Cloud sync
        </Button>
        <CloudSyncMenuDialogs
          rulesetId={rulesetId}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          busy={busy}
          isOffline={isOffline}
        />
      </>
    );
  },
);
