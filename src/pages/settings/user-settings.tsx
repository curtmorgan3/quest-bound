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
import { isCloudConfigured } from '@/lib/cloud/client';
import { useUsers } from '@/lib/compass-api';
import { cn } from '@/lib/utils';
import { usePwaUpdate } from '@/pwa/pwa-update-provider';
import { errorLogger, useOnboardingStore, usePwaInstallStore } from '@/stores';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import {
  Building2,
  Download,
  PlayCircleIcon,
  RefreshCw,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CloudAccountSettings } from './cloud-account-settings';
import { OrganizationSettings } from './organization-settings';

const QB_CLOUD_BETA_FORM_URL = 'https://forms.gle/yMqY41qBjCkdRfX6A';

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

  /** Mirrors `public.users.cloud_enabled` via `cloud_sync_enabled` RPC (see `fetchCloudSyncEnabled`). */
  const showOrganizationTab =
    isCloudConfigured && isAuthenticated && cloudSyncEnabled && !isCloudSyncEligibilityLoading;

  const showEnableQBCloud =
    isCloudConfigured && !cloudSyncEnabled && (!isAuthenticated || !isCloudSyncEligibilityLoading);

  useEffect(() => {
    if (!showOrganizationTab && activeTab === 'organization') {
      setActiveTab('profile');
    }
  }, [showOrganizationTab, activeTab]);

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
      <TabsList
        className={cn(
          'w-full max-w-2xl grid',
          showOrganizationTab ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3 max-w-md',
        )}>
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
        {showOrganizationTab ? (
          <TabsTrigger value='organization' className='gap-2'>
            <Building2 className='size-4' />
            Organization
          </TabsTrigger>
        ) : null}
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

      {showOrganizationTab ? (
        <TabsContent value='organization' className='flex flex-col gap-4 mt-4'>
          <OrganizationSettings />
        </TabsContent>
      ) : null}

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
