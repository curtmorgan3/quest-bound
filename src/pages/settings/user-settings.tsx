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
  ImageUpload,
  Input,
  Label,
  PWAInstallPrompt,
} from '@/components';
import { useUsers } from '@/lib/compass-api';
import { errorLogger, useOnboardingStore } from '@/stores';
import { Download, PlayCircleIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export const UserSettings = () => {
  const { currentUser, updateUser, deleteUser } = useUsers();
  const { setForceShowAgain } = useOnboardingStore();

  const [username, setUsername] = useState(currentUser?.username || '');
  const [exportLoading, setExportLoading] = useState(false);

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
      // Export the 100 most recent error logs
      const errorLogs = await errorLogger.exportErrorLogs();

      // Create a blob with the JSON data
      const blob = new Blob([errorLogs], { type: 'application/json' });

      // Create a download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename with current date
      const now = new Date();
      const dateString = now.toISOString().split('T')[0];
      link.download = `quest-bound-errors-${dateString}.json`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export error logs:', error);
    } finally {
      setExportLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2 max-w-sm'>
        <Label htmlFor='username'>Username</Label>
        <Input id='username' value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>

      <PWAInstallPrompt ignoreDismissed />

      <ImageUpload
        image={currentUser.image}
        alt={currentUser.username}
        onRemove={() => updateUser(currentUser.id, { assetId: null })}
        onUpload={(assetId) => updateUser(currentUser.id, { assetId })}
        onSetUrl={(url) => updateUser(currentUser.id, { assetId: null, image: url })}
        rulesetId={null}
      />

      <div className='flex flex-col gap-2'>
        <Button
          variant='outline'
          onClick={() => setForceShowAgain(true)}
          className='gap-2 w-[200px]'>
          <PlayCircleIcon className='h-4 w-4' />
          Run Tutorial
        </Button>
      </div>

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
              will permanently remove all your data. Export your rulesets if you wish to keep them.
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
    </div>
  );
};
