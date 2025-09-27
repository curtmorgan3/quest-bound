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
  Input,
  Label,
  PWAInstallPrompt,
} from '@/components';
import { useAssets, useUsers } from '@/lib/compass-api';
import { errorLogger } from '@/lib/error-logger';
import { Download, Trash } from 'lucide-react';
import { useState } from 'react';

export const UserSettings = () => {
  const { currentUser, updateUser, deleteUser } = useUsers();
  const { createAsset } = useAssets();

  const [username, setUsername] = useState(currentUser?.username || '');
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleUpdate = async () => {
    if (currentUser) {
      await updateUser(currentUser.id, { username });
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      setLoading(true);
      const assetId = await createAsset(file);
      await updateUser(currentUser.id, { assetId });
      setLoading(false);
    }
  };

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

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2 max-w-sm'>
        <Label htmlFor='username'>Username</Label>
        <Input id='username' value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>

      <PWAInstallPrompt ignoreDismissed />

      {currentUser?.image ? (
        <div className='flex gap-2'>
          <img
            className='w-[124px] h-[124px] object-cover rounded-lg cursor-pointer'
            src={currentUser.image}
            alt={currentUser.username}
            onClick={() => document.getElementById('image-settings-avatar-upload')?.click()}
          />
          <Button
            variant='ghost'
            disabled={loading}
            onClick={() => updateUser(currentUser.id, { assetId: null })}>
            <Trash />
          </Button>
        </div>
      ) : (
        <div
          className='w-[124px] h-[124px] bg-muted flex items-center justify-center rounded-lg text-3xl cursor-pointer'
          onClick={() => document.getElementById('image-settings-avatar-upload')?.click()}>
          <span className='text-sm'>{loading ? 'Loading' : 'Upload Avatar'}</span>
        </div>
      )}

      <input
        id='image-settings-avatar-upload'
        className='hidden'
        type='file'
        accept='image/*'
        onChange={handleImageChange}
      />

      <Button
        className='w-[100px]'
        onClick={handleUpdate}
        disabled={!currentUser || username === currentUser.username}>
        Update
      </Button>

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
    </div>
  );
};
