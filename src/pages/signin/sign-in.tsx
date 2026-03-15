import DiscordImage from '@/assets/discord-icon.png';
import videoSrc from '@/assets/logo-animation.mp4';
import { Button, Input, Link } from '@/components';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DISCORD_URL } from '@/constants';
import { signIn as cloudSignIn, signUp as cloudSignUp } from '@/lib/cloud/auth';
import { isCloudConfigured } from '@/lib/cloud/client';
import { useRegisterEmail, useUsers } from '@/lib/compass-api';
import { db, useCurrentUser } from '@/stores';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string | null | undefined): boolean {
  return Boolean(value?.trim() && EMAIL_REGEX.test(value.trim()));
}

/** Links the current local user to the cloud identity (sets cloudUserId). */
async function linkLocalUserToCloud(cloudUid: string): Promise<void> {
  const { currentUser } = useCurrentUser.getState();
  if (!currentUser) return;

  const existingUserWithCloud = await db.users.where('cloudUserId').equals(cloudUid).first();
  if (existingUserWithCloud && existingUserWithCloud.id !== currentUser.id) {
    return;
  }

  await db.users.update(currentUser.id, { cloudUserId: cloudUid });
  const updated = await db.users.get(currentUser.id);
  if (updated) useCurrentUser.getState().setCurrentUser(updated);
}

export const SignIn = () => {
  const { users, createUser, setCurrentUserById, updateUser } = useUsers();
  const {
    email,
    setEmail,
    registerEmail,
    emailRegistered,
  } = useRegisterEmail();

  const [usernameValue, setUsernameValue] = useState<string>('');
  const [passwordValue, setPasswordValue] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  const needUser = !users?.length;
  const selectedUser = users?.length ? users[0] : null;

  useEffect(() => {
    if (selectedUser) {
      setUsernameValue(selectedUser.username);
    }
  }, [selectedUser?.id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      setSubmitError(null);
      const trimmed = email?.trim();

      if (!trimmed) {
        setEmailError('Email is required');
        return;
      }
      if (!isValidEmail(email)) {
        setEmailError('Please enter a valid email address');
        return;
      }
      setEmailError(null);

      const trimmedUsername = usernameValue.trim();
      if (!trimmedUsername) return;

      if (isCloudConfigured && !passwordValue.trim()) {
        setSubmitError('Password is required');
        return;
      }

      let cloudUid: string | null = null;

      if (isCloudConfigured) {
        const hasCloudAccount = !needUser && !!users?.[0]?.cloudUserId;
        const result = hasCloudAccount
          ? await cloudSignIn(trimmed, passwordValue.trim())
          : await cloudSignUp(trimmed, passwordValue.trim());

        if ('error' in result) {
          setSubmitError(result.error.message);
          return;
        }
        if ('needsEmailVerification' in result) {
          setEmailVerificationSent(true);
          // Continue to create/update local user; link when they verify later
        } else {
          cloudUid = result.user.id;
        }
      }

      if (needUser) {
        await createUser(trimmedUsername);
      } else {
        const firstUser = users?.[0];
        if (firstUser) {
          if (trimmedUsername !== firstUser.username) {
            await updateUser(firstUser.id, { username: trimmedUsername });
          } else {
            await setCurrentUserById(firstUser.id);
          }
        }
      }

      if (isCloudConfigured && cloudUid) {
        await linkLocalUserToCloud(cloudUid);
      }

      if (!isCloudConfigured && !emailRegistered) {
        await registerEmail();
      }
    } catch (e: unknown) {
      console.error('Submit failed', e);
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const hasEmailValue = Boolean(email?.trim());
  const emailInvalid = hasEmailValue && !isValidEmail(email);
  const isSubmitDisabled =
    !email?.trim() ||
    !isValidEmail(email) ||
    !usernameValue.trim() ||
    (isCloudConfigured && !passwordValue.trim());

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
            {emailVerificationSent ? (
              <p
                className='text-center text-sm text-muted-foreground'
                data-testid='email-verification-message'>
                Please check your email to verify your account.
              </p>
            ) : (
              <>
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
                  if (submitError) setSubmitError(null);
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
            {isCloudConfigured && (
              <Input
                type='password'
                className='w-full'
                placeholder='Password'
                value={passwordValue}
                onChange={(e) => {
                  setPasswordValue(e.target.value);
                  if (submitError) setSubmitError(null);
                }}
                autoComplete='current-password'
                data-testid='password-input'
              />
            )}
            {submitError && (
              <p className='text-sm text-destructive' role='alert' data-testid='submit-error'>
                {submitError}
              </p>
            )}
            <Input
              className='w-full'
              placeholder='Username'
              value={usernameValue}
              onChange={(e) => setUsernameValue(e.target.value)}
              data-testid='username-input'
            />
                <Button
                  loading={submitting}
                  onClick={handleSubmit}
                  disabled={isSubmitDisabled || submitting}
                  className='w-full'
                  data-testid='submit-button'>
                  Submit
                </Button>
              </>
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
