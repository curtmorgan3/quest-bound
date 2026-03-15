/**
 * Sync status indicator for the ruleset header. Shown when viewing a cloud-synced ruleset.
 * Uses "Quest Bound Cloud" wording in tooltips/labels.
 */

import { isCloudConfigured } from '@/lib/cloud/client';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle, CloudOff, Loader2 } from 'lucide-react';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';

interface SyncStatusIndicatorProps {
  rulesetId: string;
}

export function SyncStatusIndicator({ rulesetId }: SyncStatusIndicatorProps) {
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const { isCloudSynced, isSyncing, syncError, lastSyncedAt, setSyncError } = useSyncStateStore();
  const synced = isCloudSynced(rulesetId);
  const lastSynced = lastSyncedAt[rulesetId];

  if (!isCloudConfigured || !isAuthenticated || !synced) return null;

  const isOffline = !navigator.onLine;

  const getTooltipContent = () => {
    if (syncError) {
      return (
        <div className='flex flex-col gap-1'>
          <span className='font-medium'>Sync error</span>
          <span className='text-xs'>{syncError}</span>
        </div>
      );
    }
    if (isSyncing) {
      return 'Syncing with Quest Bound Cloud…';
    }
    if (isOffline) {
      return 'Offline — sync when back online';
    }
    if (lastSynced) {
      try {
        const date = new Date(lastSynced);
        const relative = formatDistanceToNow(date, { addSuffix: true });
        return `Synced with Quest Bound Cloud ${relative}`;
      } catch {
        return 'Synced with Quest Bound Cloud';
      }
    }
    return 'Synced with Quest Bound Cloud';
  };

  const getIcon = () => {
    if (syncError) {
      return (
        <AlertCircle
          className='h-4 w-4 text-destructive'
          aria-label='Sync error'
          data-testid='sync-status-error'
        />
      );
    }
    if (isSyncing) {
      return (
        <Loader2
          className='h-4 w-4 animate-spin text-muted-foreground'
          aria-label='Syncing'
          data-testid='sync-status-syncing'
        />
      );
    }
    if (isOffline) {
      return (
        <CloudOff
          className='h-4 w-4 text-muted-foreground'
          aria-label='Offline'
          data-testid='sync-status-offline'
        />
      );
    }
    return (
      <CheckCircle
        className='h-4 w-4 text-green-600 dark:text-green-500'
        aria-label='Synced'
        data-testid='sync-status-idle'
      />
    );
  };

  const handleErrorClick = () => {
    if (syncError) setSyncError(null);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center justify-center ${syncError ? 'cursor-pointer' : 'cursor-default'}`}
          role='status'
          onClick={syncError ? handleErrorClick : undefined}
          onKeyDown={
            syncError
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleErrorClick();
                }
              : undefined
          }
          tabIndex={syncError ? 0 : undefined}
          title={syncError ? 'Click to dismiss' : undefined}>
          {getIcon()}
        </span>
      </TooltipTrigger>
      <TooltipContent side='bottom' className='max-w-xs'>
        {getTooltipContent()}
      </TooltipContent>
    </Tooltip>
  );
}
