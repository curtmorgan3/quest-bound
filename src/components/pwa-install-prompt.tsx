import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt({ ignoreDismissed = false }: { ignoreDismissed?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const dismissed = localStorage.getItem('qb.pwa-install-dismissed');
  const dismissedTime = dismissed ? parseInt(dismissed) : 0;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const dismissedRecently = Date.now() - dismissedTime < sevenDays;

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      // Clear the deferredPrompt so it can only be used once
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt so it can only be used once
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // const handleDismiss = () => {
  //   setShowInstallPrompt(false);
  //   // Store dismissal in localStorage to avoid showing again for a while
  //   localStorage.setItem('qb.pwa-install-dismissed', Date.now().toString());
  // };

  if (!showInstallPrompt || !deferredPrompt || (dismissedRecently && !ignoreDismissed)) {
    return null;
  }

  return (
    <div className='fixed bottom-4 right-4 z-50 max-w-sm'>
      <div className='bg-background border border-border rounded-lg shadow-lg p-4 space-y-3'>
        <div className='flex items-start justify-between'>
          <div className='space-y-1'>
            <h3 className='font-semibold text-sm'>Install Quest Bound</h3>
            <p className='text-xs text-muted-foreground'>
              Install this app on your device for quick access and offline support.
            </p>
          </div>
          {/* <Button variant='ghost' size='sm' onClick={handleDismiss} className='h-6 w-6 p-0'>
            <X className='h-3 w-3' />
          </Button> */}
        </div>
        <div className='flex gap-2'>
          <Button onClick={handleInstallClick} size='sm' className='flex-1'>
            <Download className='h-3 w-3 mr-1' />
            Install
          </Button>
          {/* <Button variant='outline' size='sm' onClick={handleDismiss}>
            Not now
          </Button> */}
        </div>
      </div>
    </div>
  );
}
