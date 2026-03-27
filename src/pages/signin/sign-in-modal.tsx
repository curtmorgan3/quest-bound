import DiscordImage from '@/assets/discord-icon.png';
import videoSrc from '@/assets/logo-animation.mp4';
import { Button, Input, Link } from '@/components';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DISCORD_URL } from '@/constants';
import { signIn as cloudSignIn, signUp as cloudSignUp, getSession } from '@/lib/cloud/auth';
import { isCloudConfigured } from '@/lib/cloud/client';
import { linkLocalUserToCloudAuth } from '@/lib/cloud/link-local-user-to-cloud-auth';
import { useRegisterEmail, useUsers } from '@/lib/compass-api';
import { DialogDescription } from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string | null | undefined): boolean {
  return Boolean(value?.trim() && EMAIL_REGEX.test(value.trim()));
}

export interface SignInSignUpModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  /** When 'sign-up-only', only the sign-up flow is shown (e.g. from settings "Create account"). */
  /** When 'sign-in-only', only the sign-in flow is shown (e.g. from settings "Sign in"). */
  mode?: 'default' | 'sign-up-only' | 'sign-in-only';
}

export function SignInSignUpModal({
  open,
  onOpenChange,
  onSuccess,
  mode = 'default',
}: SignInSignUpModalProps) {
  const { users, createUser, setCurrentUserById, updateUser } = useUsers();
  const registerEmail = useRegisterEmail();

  const [localEmail, setLocalEmail] = useState('');
  const [usernameValue, setUsernameValue] = useState<string>('');
  const [passwordValue, setPasswordValue] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [hasCloudSession, setHasCloudSession] = useState<boolean | null>(null);

  const needUser = !users?.length;
  const selectedUser = users?.length ? users[0] : null;
  const userHasCloudUserId = !!users?.[0]?.cloudUserId;
  const isSignInOnlyMode =
    mode === 'sign-in-only' ||
    (mode === 'default' && isCloudConfigured && hasCloudSession === false && userHasCloudUserId);

  const usesLocalEmail = mode === 'sign-up-only' || mode === 'sign-in-only';
  const email = usesLocalEmail ? localEmail : (registerEmail.email ?? '');
  const setEmail = usesLocalEmail ? setLocalEmail : registerEmail.setEmail;

  useEffect(() => {
    if (!isCloudConfigured) {
      setHasCloudSession(false);
      return;
    }
    getSession().then((session) => setHasCloudSession(!!session));
  }, []);

  useEffect(() => {
    if (selectedUser) {
      setUsernameValue(selectedUser.username);
    }
  }, [selectedUser?.id, mode]);

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

      if (isCloudConfigured && !passwordValue.trim()) {
        setSubmitError('Password is required');
        return;
      }

      if (isSignInOnlyMode) {
        const result = await cloudSignIn(trimmed, passwordValue.trim());
        if ('error' in result) {
          setSubmitError(result.error.message);
          return;
        }
        await linkLocalUserToCloudAuth(result.user.id);
        const firstUser = users?.[0];
        if (firstUser) {
          await setCurrentUserById(firstUser.id);
        }
        onSuccess?.();
        onOpenChange?.(false);
        return;
      }

      const trimmedUsername = usernameValue.trim();
      if (!trimmedUsername) return;

      let cloudUid: string | null = null;

      if (isCloudConfigured) {
        const hasCloudAccount = mode === 'sign-up-only' ? false : !needUser && userHasCloudUserId;
        const result = hasCloudAccount
          ? await cloudSignIn(trimmed, passwordValue.trim())
          : await cloudSignUp(trimmed, passwordValue.trim());

        if ('error' in result) {
          setSubmitError(result.error.message);
          return;
        }
        if ('needsEmailVerification' in result) {
          setEmailVerificationSent(true);
        } else {
          cloudUid = result.user.id;
        }
      }

      if (needUser) {
        await createUser(trimmedUsername, trimmed);
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
        await linkLocalUserToCloudAuth(cloudUid);
        if (mode === 'default') {
          onSuccess?.();
          onOpenChange?.(false);
        }
      }

      if (mode === 'default' && !isCloudConfigured && !registerEmail.emailRegistered) {
        await registerEmail.registerEmail();
      }

      if (mode === 'sign-up-only' && cloudUid) {
        onSuccess?.();
        onOpenChange?.(false);
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
  const isSubmitDisabled = isSignInOnlyMode
    ? !email?.trim() || !isValidEmail(email) || !passwordValue.trim()
    : !email?.trim() ||
      !isValidEmail(email) ||
      !usernameValue.trim() ||
      (isCloudConfigured && !passwordValue.trim());

  const showCloseButton = Boolean(onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className='flex max-h-[90dvh] max-w-md flex-col gap-6 overflow-y-auto sm:max-w-md'>
        <DialogHeader className='sr-only'>
          <DialogTitle>
            {mode === 'sign-up-only' ? 'Create account' : 'Sign in to Quest Bound'}
          </DialogTitle>
          <DialogDescription></DialogDescription>
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
              <form
                className='flex w-full flex-col gap-4'
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSubmit();
                }}>
                <div className='w-full flex justify-center items-center'>
                  <p className='text-sm text-muted-foreground'>
                    Free & Open Source Tabletop Game Engine
                  </p>
                </div>
                <div className='flex w-full flex-col gap-1'>
                  <Input
                    type='email'
                    name='email'
                    autoComplete='email'
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
                    name='password'
                    className='w-full'
                    placeholder='Password'
                    value={passwordValue}
                    onChange={(e) => {
                      setPasswordValue(e.target.value);
                      if (submitError) setSubmitError(null);
                    }}
                    autoComplete={mode === 'sign-up-only' ? 'new-password' : 'current-password'}
                    data-testid='password-input'
                  />
                )}
                {submitError && (
                  <p className='text-sm text-destructive' role='alert' data-testid='submit-error'>
                    {submitError}
                  </p>
                )}
                {!isSignInOnlyMode && (
                  <Input
                    name='username'
                    className='w-full'
                    placeholder='Username'
                    value={usernameValue}
                    onChange={(e) => setUsernameValue(e.target.value)}
                    autoComplete='username'
                    data-testid='username-input'
                  />
                )}
                <Button
                  type='submit'
                  loading={submitting}
                  disabled={isSubmitDisabled || submitting}
                  className='w-full'
                  data-testid='submit-button'>
                  Submit
                </Button>
              </form>
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
}
