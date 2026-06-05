import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import { SignInSignUpModal } from '@quest-bound/core-ui/signin';
import { Outlet } from 'react-router-dom';
import { useGameAuthorization } from '../hooks/use-game-authorization';

export function GameAuthGuard() {
  const { isAuthenticated, isLoading } = useCloudAuthStore();
  const authorized = useGameAuthorization();

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
