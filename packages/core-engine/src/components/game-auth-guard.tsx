import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components';
import { checkGameAuthorization } from '@/lib/cloud';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import { SignInSignUpModal } from '@quest-bound/core-ui/signin';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { GAME_ID } from '../game-mode';

export function GameAuthGuard() {
  const { isAuthenticated, isLoading, cloudUser } = useCloudAuthStore();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !cloudUser?.id) {
      setAuthorized(null);
      return;
    }
    checkGameAuthorization(GAME_ID, cloudUser.id).then(setAuthorized);
  }, [isAuthenticated, cloudUser?.id]);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <SignInSignUpModal
        open
        mode='default'
        onSuccess={() => {}}
      />
    );
  }

  if (authorized === null) return null;

  if (!authorized) {
    return (
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Required</DialogTitle>
            <DialogDescription>
              Access this game by joining the{' '}
              <a
                href='https://www.patreon.com/cw/QuestBoundEngine/membership'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary underline underline-offset-4 hover:text-primary/90'>
                Quest Bound Patreon
              </a>
              .
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return <Outlet />;
}
