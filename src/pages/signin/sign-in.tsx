import { AnimatedSplashCard, Button, Input, Link } from '@/components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsers } from '@/lib/compass-api';
import { useNotifications } from '@/stores';
import { motion } from 'framer-motion';
import { useState } from 'react';
import DiscordImage from './discord-icon.png';

export const SignIn = () => {
  const { addNotification } = useNotifications();
  const { users, createUser, setCurrentUserById, loading } = useUsers();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');

  const handleLogin = async () => {
    try {
      if (selectedUserId === '_new') {
        if (!newUsername) {
          addNotification({
            message: 'Must enter username',
            status: 'error',
          });
          return;
        }
        createUser(newUsername);
      } else {
        setCurrentUserById(selectedUserId);
      }
    } catch (e: any) {
      addNotification({
        status: 'error',
        message: e.message.length <= 200 ? e.message : 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <div className='flex flex-col align-center gap-8'>
      <AnimatedSplashCard delay={0.5} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.5 }}>
        <div className='flex flex-col gap-6 items-center justify-center'>
          <div className='flex gap-4 items-center'>
            <Select onValueChange={(value) => setSelectedUserId(value)} value={selectedUserId}>
              <SelectTrigger className='w-[200px]'>
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
              />
            )}
            <Button
              loading={loading}
              onClick={handleLogin}
              disabled={!selectedUserId || (selectedUserId === '_new' && !newUsername)}>
              Submit
            </Button>
          </div>

          <div className='flex flex-col gap-4 items-center'>
            <Link href='https://docs.questbound.com' target='_blank'>
              Learn More
            </Link>
            <a target='_blank' href='https://discord.gg/7QGV4muT39' data-testid='join-discord'>
              <Button variant='ghost'>
                <img alt='Discord' src={DiscordImage} style={{ height: 30, width: 30 }} />
              </Button>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
