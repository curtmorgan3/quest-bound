import { Button, Input, Label, PWAInstallPrompt } from '@/components';
import { useAssets, useUsers } from '@/lib/compass-api';
import { Trash } from 'lucide-react';
import { useState } from 'react';

export const UserSettings = () => {
  const { currentUser, updateUser, deleteUser } = useUsers();
  const { createAsset } = useAssets();

  const [username, setUsername] = useState(currentUser?.username || '');
  const [loading, setLoading] = useState(false);

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
        className='w-sm'
        onClick={handleUpdate}
        disabled={!currentUser || username === currentUser.username}>
        Update
      </Button>

      <Button
        className='w-sm'
        variant='destructive'
        onClick={() => deleteUser(currentUser!.id)}
        disabled={!currentUser}>
        Delete User
      </Button>
    </div>
  );
};
