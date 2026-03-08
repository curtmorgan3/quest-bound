import DiscordImage from '@/assets/discord-icon.png';
import videoSrc from '@/assets/logo-animation.mp4';
import { Button, Input, Link } from '@/components';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DISCORD_URL } from '@/constants';
import { useRegisterEmail, useUsers } from '@/lib/compass-api';
import { isRunningLocally } from '@/utils';
import { motion } from 'framer-motion';
import { useState } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string | null | undefined): boolean {
  return Boolean(value?.trim() && EMAIL_REGEX.test(value.trim()));
}

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
  const [emailError, setEmailError] = useState<string | null>(null);

  const requireEmail = !isRunningLocally();
  const needUser = !users?.length;

  const handleSubmit = async () => {
    try {
      const trimmed = email?.trim();

      if (requireEmail && !emailRegistered && !trimmed) {
        setEmailError('Email is required');
        return;
      }

      if (trimmed) {
        if (!isValidEmail(email)) {
          setEmailError('Please enter a valid email address');
          return;
        }
        setEmailError(null);
        await registerEmail();
      } else {
        setEmailError(null);
      }

      if (needUser) {
        if (!newUsername.trim()) return;
        await createUser(newUsername.trim());
      } else {
        const firstUser = users?.[0];
        if (firstUser) {
          setCurrentUserById(firstUser.id);
        }
      }
    } catch (e: any) {
      console.error('Submit failed', e);
    }
  };

  const needEmailRegistration = requireEmail && !emailRegistered;
  const hasEmailValue = Boolean(email?.trim());
  const emailInvalid = hasEmailValue && !isValidEmail(email);
  const isSubmitDisabled =
    (needEmailRegistration && !email?.trim()) ||
    (hasEmailValue && !isValidEmail(email)) ||
    (needUser && !newUsername.trim());
  const isSubmitting = emailLoading || loading;

  return (
    <Dialog open={true}>
      <DialogContent
        showCloseButton={false}
        className='flex max-h-[90dvh] max-w-md flex-col gap-6 overflow-y-auto sm:max-w-md'>
        <DialogHeader className='sr-only'>
          <DialogTitle>Sign in to Quest Bound</DialogTitle>
        </DialogHeader>

        <div className='flex flex-col items-center gap-6'>
          <video
            autoPlay
            muted
            src={videoSrc}
            className='max-h-[280px] w-full rounded-md object-contain'
            aria-hidden>
            Your browser does not support the video tag.
          </video>

          <div className='flex w-full flex-col gap-4'>
            <div className='w-full flex justify-center items-center'>
              <p className='text-sm text-muted-foreground'>
                Free & Open Source Tabletop Game Engine
              </p>
            </div>
            <div className='flex w-full flex-col gap-1'>
              <Input
                type='email'
                className='w-full'
                placeholder='Email'
                value={email ?? ''}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                aria-invalid={Boolean(emailError || emailInvalid)}
                aria-describedby={emailError || emailInvalid ? 'email-error' : undefined}
                data-testid='email-input'
              />
              {(emailError || emailInvalid) && (
                <p
                  id='email-error'
                  className='text-sm text-destructive'
                  role='alert'
                  data-testid='email-error'>
                  {emailError ?? 'Please enter a valid email address'}
                </p>
              )}
            </div>
            {needUser ? (
              <Input
                className='w-full'
                placeholder='Username'
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                data-testid='username-input'
              />
            ) : (
              <span
                className='rounded-md border bg-muted px-3 py-2 text-sm'
                data-testid='current-user-text'>
                {users?.[0]?.username}
              </span>
            )}
            <Button
              loading={isSubmitting}
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className='w-full'
              data-testid='submit-button'>
              Submit
            </Button>
            {requireEmail && !emailRegistered && (
              <div className='flex flex-col gap-2 items-center justify-center'>
                <p className='text-center text-sm text-muted-foreground'>
                  Email is required to use app.questbound.com
                </p>
                <a
                  target='_blank'
                  rel='noreferrer'
                  href='https://github.com/curtmorgan3/quest-bound'
                  className='underline text-sm text-mutated-foreground'>
                  Download the source code to run locally
                </a>
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 2.5 }}
            className='flex flex-col items-center gap-4'>
            <Link href='https://docs.questbound.com' target='_blank' className='text-sm underline'>
              Learn More
            </Link>
            <a target='_blank' href={DISCORD_URL} rel='noreferrer' data-testid='join-discord'>
              <Button variant='ghost' className='cursor-pointer' size='icon'>
                <img alt='Discord' src={DiscordImage} className='size-8' />
              </Button>
            </a>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
