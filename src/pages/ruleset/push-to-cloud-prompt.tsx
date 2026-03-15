/**
 * Subtle prompt when viewing a ruleset that is not yet synced to Quest Bound Cloud.
 * Shown only when cloud is configured and user is authenticated.
 * Clicking opens the push dialog (shown in ruleset sidebar).
 */

import { isCloudConfigured } from '@/lib/cloud/client';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';

interface PushToCloudPromptProps {
  rulesetId: string;
}

export function PushToCloudPrompt({ rulesetId }: PushToCloudPromptProps) {
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const { isCloudSynced, isSyncing, setPushDialogOpen } = useSyncStateStore();

  if (!isCloudConfigured || !isAuthenticated || isCloudSynced(rulesetId)) return null;

  const busy = isSyncing;

  return (
    <div
      className='flex shrink-0 flex-wrap items-center justify-center gap-2 border-b bg-muted/50 px-4 py-2 text-center text-sm text-muted-foreground'
      data-testid='push-to-cloud-prompt'>
      <span>This ruleset is only on this device.</span>
      <button
        type='button'
        onClick={() => setPushDialogOpen(true)}
        disabled={busy || !navigator.onLine}
        className='font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-50'>
        Push to Quest Bound Cloud
      </button>
      <span>to sync across devices.</span>
    </div>
  );
}
