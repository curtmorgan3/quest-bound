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
  const { usernames, hasRootDir, setRootDir, createUser, setCurrentUser, loading } = useUsers();

  const [username, setUsername] = useState<string>();
  const [newUsername, setNewUsername] = useState<string>('');

  const handleLogin = async () => {
    try {
      if (!username) {
        addNotification({
          message: 'Must enter username',
          status: 'error',
        });
        return;
      }

      if (username === '_new') {
        createUser(newUsername);
      } else {
        setCurrentUser(username);
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
        {hasRootDir ? (
          <div className='flex flex-col gap-6 items-center justify-center'>
            <div className='flex gap-4 items-center'>
              <Select onValueChange={(value) => setUsername(value)} value={username}>
                <SelectTrigger className='w-[200px]'>
                  <SelectValue placeholder='Select a user' />
                </SelectTrigger>
                <SelectContent>
                  {usernames?.map((username) => (
                    <SelectItem className='w-[200px]' key={username} value={username}>
                      {username}
                    </SelectItem>
                  ))}
                  <SelectItem className='w-[200px]' value='_new'>
                    New User
                  </SelectItem>
                </SelectContent>
              </Select>
              {username === '_new' && (
                <Input
                  className='w-[200px]'
                  placeholder='Username'
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              )}
              <Button loading={loading} onClick={handleLogin}>
                Submit
              </Button>
            </div>
            <Button variant='outline' onClick={setRootDir}>
              Set Root Directory
            </Button>
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
        ) : (
          <div className='flex flex-col gap-6 items-center justify-center'>
            <Button variant='outline' onClick={setRootDir}>
              Set Root Directory
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
