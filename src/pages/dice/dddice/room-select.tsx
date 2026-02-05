import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNotifications } from '@/hooks';
import { Link2Icon, Loader2Icon } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import type { Room } from './types';

interface Props {
  joinRoom: (roomId: string, passcode?: string) => Promise<boolean>;
  swapRooms: (roomId: string) => void;
  roomName: string;
  roomSlug: string;
  roomPasscode?: string;
  availableRooms: Room[];
  username?: string;
}

export const RoomSelect = ({
  roomSlug,
  availableRooms,
  joinRoom,
  swapRooms,
  roomPasscode,
  username,
}: Props) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [roomId, setRoomId] = React.useState<string | null>(null);
  const [passcode, setPasscode] = React.useState<string>('');
  const formRef = useRef<HTMLDivElement>(null);

  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  const handleSave = async () => {
    try {
      if (!roomId) return;
      setLoading(true);
      await joinRoom(roomId, passcode || undefined);
      setLoading(false);
      setOpen(false);
    } catch {
      setLoading(false);
      addNotification('Failed to join room', {
        type: 'error',
      });
    }
  };

  const handleCopy = () => {
    let link = `https://dddice.com/room/${roomSlug}`;
    if (roomPasscode) {
      link += `?passcode=${roomPasscode}`;
    }

    navigator.clipboard.writeText(link);
    addNotification('Copied Join Link');
  };

  if (!username) {
    return null;
  }

  return (
    <>
      {open ? (
        <div ref={formRef}>
          <div className='flex flex-row items-center gap-1'>
            <Input
              id='dice-room'
              className='h-8 w-24'
              placeholder='Room ID'
              value={roomId ?? ''}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <Input
              id='dice-room-passcode'
              className='h-8 w-24'
              placeholder='Passcode'
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              disabled={!roomId}
              loading={loading}
              size='sm'
              className='h-8'>
              Save
            </Button>
          </div>
        </div>
      ) : loading ? (
        <Loader2Icon className='size-4 animate-spin text-muted-foreground' />
      ) : (
        <div className='flex flex-row items-center gap-2'>
          <span className='text-sm'>Select Room</span>
          <Select value={roomSlug} onValueChange={swapRooms}>
            <SelectTrigger id='dice-room-select' className='w-fit min-w-[8rem]'>
              <SelectValue placeholder='Select room' />
            </SelectTrigger>
            <SelectContent>
              {availableRooms.map(({ slug, name }) => (
                <SelectItem key={slug} value={slug}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' onClick={handleCopy} className='size-8'>
                <Link2Icon className='size-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy Room</TooltipContent>
          </Tooltip>
        </div>
      )}
    </>
  );
};
