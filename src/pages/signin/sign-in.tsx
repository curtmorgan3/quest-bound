import videoSrc from '@/assets/logo-animation.mp4';
import { Button, Input, Link, PWAInstallPrompt } from '@/components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsers } from '@/lib/compass-api';
import { motion } from 'framer-motion';
import { useState } from 'react';
import DiscordImage from './discord-icon.png';

export const SignIn = () => {
  const { users, createUser, setCurrentUserById, loading } = useUsers();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');

  const handleLogin = async () => {
    try {
      if (selectedUserId === '_new') {
        if (!newUsername) {
          return;
        }
        createUser(newUsername);
      } else {
        setCurrentUserById(selectedUserId);
      }
    } catch (e: any) {
      console.error('Login failed', e);
    }
  };

  return (
    <div className='flex flex-col align-center gap-8'>
      <video autoPlay muted src={videoSrc} className='max-h-[400px]'>
        Your browser does not support the video tag.
      </video>

      <div className='flex flex-col gap-6 items-center justify-center'>
        <div className='flex gap-4 items-center'>
          <Select onValueChange={(value) => setSelectedUserId(value)} value={selectedUserId}>
            <SelectTrigger className='w-[200px]' data-testid="user-select">
              <SelectValue placeholder='Select a user' />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user) => (
                <SelectItem className='w-[200px]' key={user.id} value={user.id}>
                  {user.username}
                </SelectItem>
              ))}
              <SelectItem className='w-[200px]' value='_new'>
                New User
              </SelectItem>
            </SelectContent>
          </Select>
          {selectedUserId === '_new' && (
            <Input
              className='w-[200px]'
              placeholder='Username'
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              data-testid="username-input"
            />
          )}
          <Button
            loading={loading}
            onClick={handleLogin}
            disabled={!selectedUserId || (selectedUserId === '_new' && !newUsername)}
            data-testid="submit-button">
            Submit
          </Button>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.5 }}>
        <div className='flex flex-col gap-4 items-center'>
          <Link href='https://docs.questbound.com' target='_blank'>
            Learn More
          </Link>
          <a target='_blank' href='https://discord.gg/7QGV4muT39' data-testid='join-discord'>
            <Button variant='ghost' className='cursor-pointer'>
              <img alt='Discord' src={DiscordImage} style={{ height: 30, width: 30 }} />
            </Button>
          </a>
        </div>
      </motion.div>
      <PWAInstallPrompt />
    </div>
  );
};
