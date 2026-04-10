import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isCloudEmailVerified } from '@/lib/cloud/auth';
import { isCloudConfigured } from '@/lib/cloud/client';
import {
  acceptRulesetExternalGrant,
  listMyActiveExternalRulesetGrants,
  listPendingExternalGrantsForInvitee,
  rejectRulesetExternalGrant,
} from '@/lib/cloud/organizations/org-api';
import { useCloudAuthStore, useExternalRulesetGrantStore } from '@/stores';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

function permissionLabel(permission: 'read_only' | 'full'): string {
  return permission === 'read_only' ? 'Read only' : 'Full access';
}

/** On load, prompts the signed-in user to accept or reject pending ruleset access from an organization. */
export function PendingExternalGrantsDialog() {
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const cloudUser = useCloudAuthStore((s) => s.cloudUser);
  const cloudRulesetListEpoch = useCloudAuthStore((s) => s.cloudRulesetListEpoch);
  const touchCloudRulesetList = useCloudAuthStore((s) => s.touchCloudRulesetList);

  const [queue, setQueue] = useState<Awaited<ReturnType<typeof listPendingExternalGrantsForInvitee>>>(
    [],
  );
  const [action, setAction] = useState<'accept' | 'reject' | null>(null);

  const reloadQueue = useCallback(async () => {
    if (!isCloudConfigured || !isAuthenticated || !cloudUser || !isCloudEmailVerified(cloudUser)) {
      setQueue([]);
      return;
    }
    try {
      const rows = await listPendingExternalGrantsForInvitee();
      setQueue(rows);
    } catch {
      setQueue([]);
    }
  }, [isAuthenticated, cloudUser]);

  useEffect(() => {
    void reloadQueue();
  }, [reloadQueue, cloudRulesetListEpoch]);

  const current = queue[0];
  const open = Boolean(current);
  const actionBusy = action !== null;

  const refreshGrantsAfterResolution = useCallback(async () => {
    try {
      const rows = await listMyActiveExternalRulesetGrants();
      useExternalRulesetGrantStore.getState().setPermissionsFromRows(rows);
    } catch {
      /* ignore; layout effect will retry */
    }
    touchCloudRulesetList();
  }, [touchCloudRulesetList]);

  const handleAccept = async () => {
    if (!current) return;
    setAction('accept');
    try {
      await acceptRulesetExternalGrant(current.grant_id);
      toast.success('Ruleset access accepted');
      setQueue((q) => q.slice(1));
      await refreshGrantsAfterResolution();
      void reloadQueue();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not accept this invitation');
    } finally {
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (!current) return;
    setAction('reject');
    try {
      await rejectRulesetExternalGrant(current.grant_id);
      toast.message('Invitation declined');
      setQueue((q) => q.slice(1));
      void reloadQueue();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not decline this invitation');
    } finally {
      setAction(null);
    }
  };

  const rulesetLabel = current?.ruleset_title?.trim() || current?.ruleset_id || 'this ruleset';

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        overlayClassName='z-[200] bg-black/50'
        className='z-[210] sm:max-w-md'
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-busy={actionBusy || undefined}
        data-testid='pending-external-grants-dialog'>
        <DialogHeader>
          <DialogTitle>Ruleset access invitation</DialogTitle>
          <DialogDescription asChild>
            <div className='text-muted-foreground space-y-3 text-sm'>
              <p>
                <span className='text-foreground font-medium'>{current?.organization_name}</span>{' '}
                invited you to access{' '}
                <span className='text-foreground font-medium'>{rulesetLabel}</span> from Quest Bound
                Cloud.
              </p>
              <p>
                Permission:{' '}
                <span className='text-foreground font-medium'>
                  {current ? permissionLabel(current.permission) : ''}
                </span>
              </p>
              {queue.length > 1 ? (
                <p className='text-xs'>You have {queue.length} pending invitations (shown one at a time).</p>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='gap-2 sm:gap-2'>
          <Button
            type='button'
            variant='outline'
            disabled={actionBusy}
            onClick={() => void handleReject()}>
            {action === 'reject' ? <Loader2 className='mr-2 size-4 shrink-0 animate-spin' /> : null}
            Decline
          </Button>
          <Button type='button' disabled={actionBusy} onClick={() => void handleAccept()}>
            {action === 'accept' ? <Loader2 className='mr-2 size-4 shrink-0 animate-spin' /> : null}
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
