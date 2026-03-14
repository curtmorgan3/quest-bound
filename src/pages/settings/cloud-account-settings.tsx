import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/components';
import { useUsers } from '@/lib/compass-api';
import { signIn, signOut, signUp, updatePassword } from '@/lib/cloud/auth';
import { isCloudConfigured } from '@/lib/cloud/client';
import { db } from '@/stores';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import { useCurrentUser } from '@/stores/current-user-store';
import { AlertCircle, Mail } from 'lucide-react';
import { useState } from 'react';

function SignInDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn(email, password);
      if ('error' in result) {
        setError(result.error.message);
        return;
      }
      onSuccess();
      onOpenChange(false);
      setEmail('');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in to Cloud</DialogTitle>
          <DialogDescription>
            Use your Quest Bound Cloud account to enable sync across devices.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          {error && (
            <div className='flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive'>
              <AlertCircle className='size-4 shrink-0' />
              {error}
            </div>
          )}
          <div className='grid gap-2'>
            <Label htmlFor='cloud-signin-email'>Email</Label>
            <Input
              id='cloud-signin-email'
              type='email'
              autoComplete='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='cloud-signin-password'>Password</Label>
            <Input
              id='cloud-signin-password'
              type='password'
              autoComplete='current-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SignUpDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailVerificationSent(false);
    setLoading(true);
    try {
      const result = await signUp(email, password);
      if ('error' in result) {
        setError(result.error.message);
        return;
      }
      if ('needsEmailVerification' in result) {
        setEmailVerificationSent(true);
        return;
      }
      onSuccess();
      onOpenChange(false);
      setEmail('');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create cloud account</DialogTitle>
          <DialogDescription>
            Create a Quest Bound Cloud account to sync your rulesets across devices.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          {error && (
            <div className='flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive'>
              <AlertCircle className='size-4 shrink-0' />
              {error}
            </div>
          )}
          {emailVerificationSent && (
            <div className='flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground'>
              <Mail className='size-4 shrink-0' />
              Check your email for a verification link to complete your account setup.
            </div>
          )}
          <div className='grid gap-2'>
            <Label htmlFor='cloud-signup-email'>Email</Label>
            <Input
              id='cloud-signup-email'
              type='email'
              autoComplete='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='cloud-signup-password'>Password</Label>
            <Input
              id='cloud-signup-password'
              type='password'
              autoComplete='new-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await updatePassword(password);
      if (err) {
        setError(err.message);
        return;
      }
      onOpenChange(false);
      setPassword('');
      setConfirm('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Set a new password for your Cloud account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          {error && (
            <div className='flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive'>
              <AlertCircle className='size-4 shrink-0' />
              {error}
            </div>
          )}
          <div className='grid gap-2'>
            <Label htmlFor='cloud-new-password'>New password</Label>
            <Input
              id='cloud-new-password'
              type='password'
              autoComplete='new-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='cloud-confirm-password'>Confirm password</Label>
            <Input
              id='cloud-confirm-password'
              type='password'
              autoComplete='new-password'
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Links the current local user to the cloud identity (sets cloudUserId). Handles re-link if already linked to another account. */
async function linkLocalUserToCloud(cloudUid: string): Promise<void> {
  const { currentUser } = useCurrentUser.getState();
  if (!currentUser) return;

  const existingUserWithCloud = await db.users.where('cloudUserId').equals(cloudUid).first();
  if (existingUserWithCloud && existingUserWithCloud.id !== currentUser.id) {
    // Another local user is already linked to this cloud account; leave current user unchanged
    // (one cloud per device: we could optionally switch active user to existingUserWithCloud)
    return;
  }

  await db.users.update(currentUser.id, { cloudUserId: cloudUid });
  const updated = await db.users.get(currentUser.id);
  if (updated) useCurrentUser.getState().setCurrentUser(updated);
}

export function CloudAccountSettings() {
  const { isAuthenticated, cloudUser, isLoading } = useCloudAuthStore();
  const { currentUser, updateUser } = useUsers();
  const [signInOpen, setSignInOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleAuthSuccess = () => {
    const uid = useCloudAuthStore.getState().cloudUser?.id;
    if (uid) linkLocalUserToCloud(uid);
  };

  const handleSignOut = async () => {
    await signOut();
    if (currentUser?.cloudUserId) {
      await updateUser(currentUser.id, { cloudUserId: null });
      const updated = await db.users.get(currentUser.id);
      if (updated) useCurrentUser.getState().setCurrentUser(updated);
    }
  };

  if (!isCloudConfigured) return null;
  if (isLoading) return <p className='text-sm text-muted-foreground'>Loading Cloud…</p>;

  return (
    <div className='flex flex-col gap-4'>
      <h3 className='text-sm font-medium'>Quest Bound Cloud</h3>
      {!isAuthenticated ? (
        <div className='flex flex-col gap-2'>
          <p className='text-sm text-muted-foreground'>
            Sign in or create an account to sync rulesets across devices.
          </p>
          <div className='flex gap-2'>
            <Button variant='outline' size='sm' onClick={() => setSignInOpen(true)}>
              Sign in to Cloud
            </Button>
            <Button variant='outline' size='sm' onClick={() => setSignUpOpen(true)}>
              Create cloud account
            </Button>
          </div>
        </div>
      ) : (
        <div className='flex flex-col gap-2'>
          <p className='text-sm text-muted-foreground'>
            Signed in as <span className='font-medium text-foreground'>{cloudUser?.email}</span>
          </p>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' size='sm' onClick={() => setChangePasswordOpen(true)}>
              Change password
            </Button>
            <Button variant='outline' size='sm' onClick={handleSignOut}>
              Sign out of Cloud
            </Button>
          </div>
        </div>
      )}

      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        onSuccess={handleAuthSuccess}
      />
      <SignUpDialog
        open={signUpOpen}
        onOpenChange={setSignUpOpen}
        onSuccess={handleAuthSuccess}
      />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
