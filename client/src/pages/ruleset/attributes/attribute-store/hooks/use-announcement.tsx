import { LogicalValue } from '@/libs/compass-planes';
import { emitter } from '@/libs/compass-web-utils';
import { Center, Text, ToastId, useToast } from '@chakra-ui/react';
import { useRef } from 'react';

export type Announcement = {
  message: LogicalValue;
  placement?: 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left';
  announcementId?: string | null;
};

export const useAnnouncement = () => {
  const toast = useToast();
  const toastIdRef = useRef<ToastId>(undefined);

  function close() {
    if (toastIdRef.current) {
      toast.close(toastIdRef.current);
    }
  }

  const announce = (announcement: Announcement) => {
    if (announcement.announcementId) {
      // Broadcast announcement event. Components with the same announcementId will listen for this event to
      // conditionally render.
      emitter.emit(`announcement:${announcement.announcementId}`, announcement.message);
      return;
    }

    toastIdRef.current = toast({
      description: announcement.message,
      isClosable: true,
      position: announcement.placement || 'bottom-left',
      render: () => (
        <Center padding={2} backgroundColor='info'>
          <Text>{announcement.message}</Text>
        </Center>
      ),
    });
  };

  return { announce };
};
