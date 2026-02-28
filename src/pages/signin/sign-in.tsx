import DiscordImage from '@/assets/discord-icon.png';
import videoSrc from '@/assets/logo-animation.mp4';
import { Button, Input, Link, PWAInstallPrompt } from '@/components';
import { DISCORD_URL } from '@/constants';
import { useRegisterEmail, useUsers } from '@/lib/compass-api';
import { isRunningLocally } from '@/utils';
import { motion } from 'framer-motion';
import { useState } from 'react';

export const SignIn = () => {
  const { users, createUser, setCurrentUserById, loading } = useUsers();
  const {
    email,
    setEmail,
    registerEmail,
    emailRegistered,
    loading: emailLoading,
  } = useRegisterEmail();

  const [newUsername, setNewUsername] = useState<string>('');

  const handleEmailSubmit = () => {
    registerEmail();
  };

  const handleLogin = async () => {
    try {
      if (!users?.length) {
        if (!newUsername.trim()) {
          return;
        }
        await createUser(newUsername.trim());
      } else {
        const firstUser = users[0];
        if (firstUser) {
          setCurrentUserById(firstUser.id);
        }
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
        {!emailRegistered && !isRunningLocally() && (
          <div className='flex flex-col gap-2 items-center'>
            <div className='flex gap-2 items-center'>
              <Input
                type='email'
                className='w-[200px]'
                placeholder='Email'
                value={email ?? ''}
                onChange={(e) => setEmail(e.target.value)}
                data-testid='email-input'
              />
              <Button
                loading={emailLoading}
                onClick={handleEmailSubmit}
                disabled={!email?.trim()}
                data-testid='register-email-button'>
                Register email
              </Button>
            </div>
            <p className='text-sm'>
              You must register your email address to use app.questbound.com
            </p>
            <a
              target='_blank'
              href='https://github.com/curtmorgan3/quest-bound'
              style={{ textDecoration: 'underline' }}
              className='text-sm'>
              Download the source code to run Quest Bound locally
            </a>
          </div>
        )}
        {(emailRegistered || isRunningLocally()) && (
          <div className='flex gap-4 flex-col items-center'>
            {!users?.length ? (
              <Input
                className='w-[200px]'
                placeholder='username'
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                data-testid='username-input'
              />
            ) : (
              <span data-testid='current-user-text'>{users[0]?.username}</span>
            )}
            <Button
              loading={loading}
              onClick={handleLogin}
              disabled={!users?.length && !newUsername.trim()}
              data-testid='submit-button'>
              Launch
            </Button>
          </div>
        )}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.5 }}>
        <div className='flex flex-col gap-4 items-center'>
          <Link href='https://docs.questbound.com' target='_blank'>
            Learn More
          </Link>
          <a target='_blank' href={DISCORD_URL} data-testid='join-discord'>
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
