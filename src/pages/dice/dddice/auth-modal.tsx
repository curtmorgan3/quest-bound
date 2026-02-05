import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link } from '@/components/ui/link';
import { Text } from '@/components/ui/text';
import { colorWhite } from '@/palette';
import { Loader2Icon, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import dddiceImg from '../../../assets/dddice.png';

interface Props {
  createAuthCode: () => Promise<string>;
  pollForAuth: (code: string) => void;
  clearPoll: () => void;
  username?: string;
  logout: () => void;
}

export const DddiceAuthModal = ({
  createAuthCode,
  pollForAuth,
  clearPoll,
  username,
  logout,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (username) {
      setOpen(false);
    }
  }, [username]);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    const authCode = await createAuthCode();
    setCode(authCode);
    setLoading(false);

    pollForAuth(authCode);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      clearPoll();
    }
  };

  return (
    <>
      <div className='flex flex-row items-center gap-2'>
        <img src={dddiceImg} alt='dddice' className='size-8' />
        {username ? (
          <div className='flex flex-row items-center gap-2'>
            <Text>{username}</Text>
            <Button variant='ghost' size='icon' title='Logout' onClick={logout} className='size-8'>
              <LogOut className='size-4' />
            </Button>
          </div>
        ) : (
          <Button
            variant='link'
            className='p-0 h-auto font-normal underline'
            style={{ color: colorWhite }}
            onClick={handleOpen}>
            Login to dddice
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to dddice</DialogTitle>
            <DialogDescription asChild>
              <div className='flex flex-col items-center gap-2 pt-2 text-center'>
                {loading ? (
                  <Loader2Icon className='size-8 animate-spin text-muted-foreground' />
                ) : (
                  <>
                    <Text>Go to</Text>
                    <Link
                      href={`https://dddice.com/activate?code=${code}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-foreground text-xl underline'>
                      dddice.com/activate
                    </Link>
                    <Text>and enter this code:</Text>
                    <Text className='text-xl font-medium'>{code}</Text>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
