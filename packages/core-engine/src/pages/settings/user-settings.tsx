import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ImageUpload,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components';
import { useNotifications } from '@/hooks/use-notifications';
import { isCloudConfigured } from '@/lib/cloud/client';
import {
  acceptOrganizationInvite,
  dismissOrganizationInvite,
  fetchOrganizationAsAdmin,
  leaveOrganization,
  listMyOrganizationMemberships,
  listPendingInvitesForCurrentUser,
  type MyOrganizationMembershipRow,
  type OrganizationRow,
  type PendingInviteForUserRow,
} from '@/lib/cloud/organizations/org-api';
import { useUsers } from '@/lib/compass-api';
import { cn } from '@/lib/utils';
import { usePwaUpdate } from '@/pwa/pwa-update-provider';
import { errorLogger, useOnboardingStore, usePwaInstallStore } from '@/stores';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import {
  Building2,
  Download,
  Loader2,
  PlayCircleIcon,
  RefreshCw,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CloudAccountSettings } from './cloud-account-settings';

const QB_CLOUD_BETA_FORM_URL = 'https://forms.gle/yMqY41qBjCkdRfX6A';

type OrgListEntry = {
  id: string;
  name: string;
  slug: string;
  roleLabel: string;
  joinedAt: string;
  canLeave: boolean;
};

function UserOrganizationsTab() {
  const { addNotification } = useNotifications();
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const cloudUser = useCloudAuthStore((s) => s.cloudUser);
  const cloudRulesetListEpoch = useCloudAuthStore((s) => s.cloudRulesetListEpoch);
  const touchCloudRulesetList = useCloudAuthStore((s) => s.touchCloudRulesetList);

  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<MyOrganizationMembershipRow[]>([]);
  const [adminOrg, setAdminOrg] = useState<OrganizationRow | null>(null);
  const [invites, setInvites] = useState<PendingInviteForUserRow[]>([]);
  const [inviteBusy, setInviteBusy] = useState<{ id: string; action: 'accept' | 'reject' } | null>(
    null,
  );
  const [leaveTarget, setLeaveTarget] = useState<OrgListEntry | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!isCloudConfigured || !isAuthenticated || !cloudUser?.id) {
      setMemberships([]);
      setAdminOrg(null);
      setInvites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [mems, admin, invs] = await Promise.all([
        listMyOrganizationMemberships(),
        fetchOrganizationAsAdmin(cloudUser.id),
        listPendingInvitesForCurrentUser(),
      ]);
      setMemberships(mems);
      setAdminOrg(admin);
      setInvites(invs);
    } catch (e) {
      addNotification(e instanceof Error ? e.message : 'Could not load organizations.', {
        type: 'error',
      });
      setMemberships([]);
      setAdminOrg(null);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [addNotification, cloudUser?.id, isAuthenticated]);

  useEffect(() => {
    void reload();
  }, [reload, cloudRulesetListEpoch]);

  const orgEntries = useMemo((): OrgListEntry[] => {
    const uid = cloudUser?.id;
    if (!uid) return [];

    const byId = new Map<string, OrgListEntry>();

    for (const m of memberships) {
      const org = m.organizations;
      const name = org?.name?.trim() ? org.name.trim() : 'Unknown organization';
      const slug = org?.slug ?? '';
      const isAdmin = org?.admin_user_id === uid;
      byId.set(m.organization_id, {
        id: m.organization_id,
        name,
        slug,
        roleLabel: isAdmin ? 'Administrator' : 'Member',
        joinedAt: m.joined_at,
        canLeave: !isAdmin,
      });
    }

    if (adminOrg && !byId.has(adminOrg.id)) {
      byId.set(adminOrg.id, {
        id: adminOrg.id,
        name: adminOrg.name,
        slug: adminOrg.slug,
        roleLabel: 'Administrator',
        joinedAt: adminOrg.created_at,
        canLeave: false,
      });
    }

    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [adminOrg, cloudUser?.id, memberships]);

  const handleAcceptInvite = async (inviteId: string) => {
    setInviteBusy({ id: inviteId, action: 'accept' });
    try {
      await acceptOrganizationInvite(inviteId);
      touchCloudRulesetList();
      addNotification('You joined the organization.', { type: 'success' });
      await reload();
    } catch (e) {
      addNotification(e instanceof Error ? e.message : 'Could not accept the invite.', {
        type: 'error',
      });
    } finally {
      setInviteBusy(null);
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    setInviteBusy({ id: inviteId, action: 'reject' });
    try {
      await dismissOrganizationInvite(inviteId);
      addNotification('Invite declined.', { type: 'success' });
      await reload();
    } catch (e) {
      addNotification(e instanceof Error ? e.message : 'Could not decline the invite.', {
        type: 'error',
      });
    } finally {
      setInviteBusy(null);
    }
  };

  const handleLeaveOrganization = async () => {
    if (!leaveTarget) return;
    setLeaveLoading(true);
    try {
      await leaveOrganization(leaveTarget.id);
      touchCloudRulesetList();
      addNotification('You left the organization.', { type: 'success' });
      setLeaveTarget(null);
      await reload();
    } catch (e) {
      addNotification(e instanceof Error ? e.message : 'Could not leave the organization.', {
        type: 'error',
      });
    } finally {
      setLeaveLoading(false);
    }
  };

  if (!isCloudConfigured) {
    return (
      <p className='text-sm text-muted-foreground max-w-md'>
        Quest Bound Cloud is not configured on this deployment, so organization membership is
        unavailable.
      </p>
    );
  }

  if (!isAuthenticated) {
    return (
      <p className='text-sm text-muted-foreground max-w-md'>
        Sign in under Account to see organizations you belong to and manage invites.
      </p>
    );
  }

  if (loading) {
    return (
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' />
        Loading organizations…
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8 max-w-lg'>
      {invites.length > 0 ? (
        <div className='flex flex-col gap-3'>
          <h3 className='text-sm font-medium text-foreground'>Pending invites</h3>
          <ul className='flex flex-col gap-3'>
            {invites.map((inv) => {
              const orgName =
                inv.organizations?.name?.trim() || 'Unknown organization';
              const busy = inviteBusy?.id === inv.id;
              return (
                <li
                  key={inv.id}
                  className='flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='flex flex-col gap-0.5 min-w-0'>
                    <span className='font-medium text-foreground truncate'>{orgName}</span>
                    <span className='text-xs text-muted-foreground'>
                      Invited{' '}
                      {new Date(inv.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <div className='flex shrink-0 flex-wrap gap-2'>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      className='gap-2'
                      disabled={busy}
                      onClick={() => void handleRejectInvite(inv.id)}>
                      {busy && inviteBusy?.action === 'reject' ? (
                        <Loader2 className='size-4 shrink-0 animate-spin' />
                      ) : null}
                      Reject
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      className='gap-2'
                      disabled={busy}
                      onClick={() => void handleAcceptInvite(inv.id)}>
                      {busy && inviteBusy?.action === 'accept' ? (
                        <Loader2 className='size-4 shrink-0 animate-spin' />
                      ) : null}
                      Accept
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className='flex flex-col gap-3'>
        <h3 className='text-sm font-medium text-foreground'>Your organizations</h3>
        {orgEntries.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            You are not a member of any organization yet.
          </p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {orgEntries.map((row) => (
              <li
                key={row.id}
                className='flex flex-col gap-3 rounded-md border border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between'>
                <div className='flex min-w-0 flex-1 flex-col gap-1'>
                  <div className='flex flex-wrap items-baseline justify-between gap-2'>
                    <span className='font-medium text-foreground'>{row.name}</span>
                    <span className='text-xs text-muted-foreground uppercase tracking-wide'>
                      {row.roleLabel}
                    </span>
                  </div>
                  <span className='text-xs text-muted-foreground font-mono'>/{row.slug}</span>
                  <span className='text-xs text-muted-foreground'>
                    Joined{' '}
                    {new Date(row.joinedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                </div>
                {row.canLeave ? (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive'
                    onClick={() => setLeaveTarget(row)}>
                    Leave
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {orgEntries.some((r) => !r.canLeave) ? (
          <p className='text-xs text-muted-foreground max-w-md'>
            Organization administrators cannot leave here; remove the organization from your ruleset
            settings instead.
          </p>
        ) : null}
      </div>

      <AlertDialog
        open={leaveTarget !== null}
        onOpenChange={(open) => {
          if (!open && !leaveLoading) setLeaveTarget(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave organization?</AlertDialogTitle>
            <AlertDialogDescription>
              {leaveTarget ? (
                <>
                  You will leave <span className='font-medium text-foreground'>{leaveTarget.name}</span>
                  .{' '}
                  {`You may lose access to this organization's shared cloud rulesets until you are invited again.`}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaveLoading}>Cancel</AlertDialogCancel>
            <Button
              type='button'
              variant='destructive'
              className='gap-2'
              disabled={leaveLoading}
              onClick={() => void handleLeaveOrganization()}>
              {leaveLoading ? <Loader2 className='size-4 shrink-0 animate-spin' /> : null}
              Leave organization
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const UserSettings = () => {
  const { currentUser, updateUser, deleteUser } = useUsers();
  const { setForceShowAgain } = useOnboardingStore();
  const { deferredPrompt, triggerInstall } = usePwaInstallStore();
  const { appVersion, needRefresh, updateServiceWorker, checkForUpdate, swSupported } =
    usePwaUpdate();
  const { cloudSyncEnabled, isCloudSyncEligibilityLoading, isAuthenticated } = useCloudAuthStore();
  const [installLoading, setInstallLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [username, setUsername] = useState(currentUser?.username || '');
  const [exportLoading, setExportLoading] = useState(false);
  const [updateCheckLoading, setUpdateCheckLoading] = useState(false);

  const showEnableQBCloud =
    isCloudConfigured && !cloudSyncEnabled && (!isAuthenticated || !isCloudSyncEligibilityLoading);

  const handleUpdate = async () => {
    if (currentUser) {
      await updateUser(currentUser.id, { username });
    }
  };

  useEffect(() => {
    if (username === currentUser?.username) return;

    setTimeout(() => {
      handleUpdate();
    }, 500);
  }, [username]);

  const handleExportErrors = async () => {
    setExportLoading(true);
    try {
      const errorLogs = await errorLogger.exportErrorLogs();
      const blob = new Blob([errorLogs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const dateString = now.toISOString().split('T')[0];
      link.download = `quest-bound-errors-${dateString}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export error logs:', error);
    } finally {
      setExportLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
      <TabsList className={cn('w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4')}>
        <TabsTrigger value='profile' className='gap-2'>
          <User className='size-4' />
          Profile
        </TabsTrigger>
        <TabsTrigger value='preferences' className='gap-2'>
          <Settings className='size-4' />
          Preferences
        </TabsTrigger>
        <TabsTrigger value='account' className='gap-2'>
          <Shield className='size-4' />
          Account
        </TabsTrigger>
        <TabsTrigger value='organizations' className='gap-2'>
          <Building2 className='size-4' />
          Organization
        </TabsTrigger>
      </TabsList>

      <TabsContent value='profile' className='flex flex-col gap-4 mt-4'>
        <div className='flex flex-col gap-2 max-w-sm'>
          <Label htmlFor='username'>Username</Label>
          <Input id='username' value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className='flex flex-col gap-2'>
          <Label>Avatar</Label>
          <ImageUpload
            image={currentUser.image}
            alt={currentUser.username}
            onRemove={() => updateUser(currentUser.id, { assetId: null })}
            onUpload={(assetId) => updateUser(currentUser.id, { assetId })}
            rulesetId={null}
          />
        </div>
      </TabsContent>

      <TabsContent value='preferences' className='flex flex-col gap-4 mt-4'>
        <div className='flex flex-col gap-2'>
          <Button
            variant='outline'
            onClick={() => setForceShowAgain(true)}
            className='gap-2 w-[200px]'>
            <PlayCircleIcon className='h-4 w-4' />
            Run Tutorial
          </Button>
        </div>

        <div className='flex flex-col gap-2 max-w-md'>
          <Label>App version</Label>
          <div className='flex flex-wrap items-center gap-3'>
            <span className='text-sm text-muted-foreground tabular-nums'>{appVersion}</span>
            <Button
              variant='outline'
              className='gap-2 w-fit'
              disabled={!swSupported || updateCheckLoading}
              onClick={async () => {
                if (needRefresh) {
                  await updateServiceWorker();
                  return;
                }
                setUpdateCheckLoading(true);
                try {
                  await checkForUpdate();
                } finally {
                  setUpdateCheckLoading(false);
                }
              }}>
              <RefreshCw className={cn('h-4 w-4', updateCheckLoading && 'animate-spin')} />
              {needRefresh
                ? 'Restart to update'
                : updateCheckLoading
                  ? 'Checking…'
                  : 'Check for updates'}
            </Button>
            <Button
              variant='outline'
              onClick={async () => {
                if (!deferredPrompt) return;
                setInstallLoading(true);
                try {
                  await triggerInstall();
                } finally {
                  setInstallLoading(false);
                }
              }}
              disabled={!deferredPrompt || installLoading}
              className='gap-2 w-fit'>
              <Download className='h-4 w-4' />
              {installLoading ? 'Installing…' : 'Install app'}
            </Button>
          </div>
          {!swSupported ? (
            <p className='text-xs text-muted-foreground'>
              Progressive Web App updates apply in supported browsers
            </p>
          ) : null}
          {!deferredPrompt ? (
            <p className='text-xs text-muted-foreground'>
              Install is available when your browser supports it and the app is not already
              installed.
            </p>
          ) : null}
        </div>

        <div className='flex items-center gap-2'>
          <Checkbox
            id='sheetAttributeAnimations'
            checked={currentUser.preferences?.sheetAttributeAnimations ?? true}
            onCheckedChange={(checked) => {
              if (currentUser) {
                updateUser(currentUser.id, {
                  preferences: {
                    ...currentUser.preferences,
                    sheetAttributeAnimations: checked === true,
                  },
                });
              }
            }}
          />
          <Label htmlFor='sheetAttributeAnimations' className='cursor-pointer font-normal'>
            Animate sheet attribute changes when available
          </Label>
        </div>

        <div className='flex items-center gap-2'>
          <Checkbox
            id='numberWheelDefaultOnTouch'
            checked={currentUser.preferences?.numberWheelDefaultOnTouch !== false}
            onCheckedChange={(checked) => {
              if (currentUser) {
                updateUser(currentUser.id, {
                  preferences: {
                    ...currentUser.preferences,
                    numberWheelDefaultOnTouch: checked === true,
                  },
                });
              }
            }}
          />
          <Label htmlFor='numberWheelDefaultOnTouch' className='cursor-pointer font-normal'>
            Use number wheel UI by default on touch devices
          </Label>
        </div>
      </TabsContent>

      <TabsContent value='organizations' className='flex flex-col gap-4 mt-4'>
        <UserOrganizationsTab />
      </TabsContent>

      <TabsContent value='account' className='flex flex-col gap-4 mt-4'>
        <CloudAccountSettings />

        {showEnableQBCloud && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant='outline' className='gap-2 w-fit'>
                Enable QBCloud
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Quest Bound Cloud</DialogTitle>
                <DialogDescription className='space-y-3 pt-1'>
                  <span className='block'>
                    Enable cloud backups, device sync, collaboration and multiplayer campaigns.
                  </span>
                  <a
                    href={QB_CLOUD_BETA_FORM_URL}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex font-medium text-primary underline underline-offset-4 hover:text-primary/90'>
                    Request access to the free beta
                  </a>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        )}

        <div className='flex flex-col gap-2'>
          <Button
            variant='outline'
            onClick={handleExportErrors}
            disabled={exportLoading}
            className='gap-2 w-[200px]'>
            <Download className='h-4 w-4' />
            {exportLoading ? 'Exporting...' : 'Export Error Logs'}
          </Button>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className='w-[100px]' variant='destructive' disabled={!currentUser}>
              Delete User
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete your user account? This action cannot be undone and
                will permanently remove all your data. Export your rulesets if you wish to keep
                them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteUser(currentUser!.id)}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TabsContent>
    </Tabs>
  );
};
