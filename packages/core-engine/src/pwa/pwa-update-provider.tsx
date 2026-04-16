import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Workbox } from 'workbox-window';

/**
 * Prompt-mode SW registration (same behavior as vite-plugin-pwa's virtual:pwa-register/react)
 * but without the virtual module. That import breaks Vite 7 production builds when Rollup also
 * bundles code (e.g. worker graphs) where vite-plugin-pwa's resolveId hook is not applied.
 *
 * Must stay aligned with VitePWA options in vite.config.ts: default `filename: 'sw.js'`,
 * `registerType: 'prompt'`, and scope derived from `base`.
 */
function useWorkboxPromptRegister(options: {
  immediate?: boolean;
  onRegisteredSW?: (
    swScriptUrl: string,
    registration: ServiceWorkerRegistration | undefined,
  ) => void;
}): {
  needRefresh: boolean;
  updateServiceWorker: () => Promise<void>;
} {
  const { immediate = true, onRegisteredSW } = options;
  const [needRefresh, setNeedRefresh] = useState(false);
  const wbRef = useRef<Workbox | undefined>(undefined);
  const onRegisteredSWRef = useRef(onRegisteredSW);
  onRegisteredSWRef.current = onRegisteredSW;

  const updateServiceWorker = useCallback(async () => {
    wbRef.current?.messageSkipWaiting();
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const base = import.meta.env.BASE_URL;
    const swScriptUrl = `${base}sw.js`;
    const scope = base;

    const wb = new Workbox(swScriptUrl, { scope, type: 'classic' });
    wbRef.current = wb;

    const showSkipWaitingPrompt = () => {
      wb.addEventListener('controlling', (event) => {
        if (event.isUpdate) window.location.reload();
      });
      setNeedRefresh(true);
    };

    wb.addEventListener('installed', (event) => {
      if (typeof event.isUpdate === 'undefined' && typeof event.isExternal !== 'undefined') {
        if (event.isExternal) showSkipWaitingPrompt();
      }
    });
    wb.addEventListener('waiting', showSkipWaitingPrompt);

    void wb
      .register({ immediate })
      .then((r) => {
        onRegisteredSWRef.current?.(swScriptUrl, r);
      })
      .catch(() => {
        /* ignore registration errors (e.g. no SW in dev) */
      });

    return () => {
      wbRef.current = undefined;
    };
  }, [immediate]);

  return { needRefresh, updateServiceWorker };
}

export interface PwaUpdateContextValue {
  /** True when a new service worker is waiting and the user should reload. */
  needRefresh: boolean;
  /** Applies the waiting worker and reloads when it takes control. */
  updateServiceWorker: () => Promise<void>;
  /** Asks the browser to re-fetch the service worker script. */
  checkForUpdate: () => Promise<void>;
  appVersion: string;
  swSupported: boolean;
}

const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null);

function PwaUpdateToast() {
  const ctx = useContext(PwaUpdateContext);
  const [dismissed, setDismissed] = useState(false);
  const prevNeedRefresh = useRef(false);

  useEffect(() => {
    if (ctx?.needRefresh && !prevNeedRefresh.current) {
      setDismissed(false);
    }
    prevNeedRefresh.current = ctx?.needRefresh ?? false;
  }, [ctx?.needRefresh]);

  if (!ctx?.needRefresh || dismissed || !ctx.swSupported) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[100] max-w-sm',
        'bg-background border border-border rounded-lg shadow-lg p-4 space-y-3',
      )}
      role='status'>
      <div className='flex items-start justify-between gap-2'>
        <div className='space-y-1 min-w-0'>
          <p className='font-semibold text-sm'>Update available</p>
          <p className='text-xs text-muted-foreground'>
            A new version of Quest Bound is ready. Restart to use it.
          </p>
        </div>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => setDismissed(true)}
          className='h-6 w-6 p-0 shrink-0'
          aria-label='Dismiss update notice'>
          <X className='h-3 w-3' />
        </Button>
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          size='sm'
          className='flex-1'
          onClick={() => void ctx.updateServiceWorker()}>
          <RefreshCw className='h-3 w-3 mr-1' />
          Restart now
        </Button>
        <Button type='button' variant='outline' size='sm' onClick={() => setDismissed(true)}>
          Later
        </Button>
      </div>
    </div>
  );
}

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);

  const { needRefresh, updateServiceWorker } = useWorkboxPromptRegister({
    immediate: true,
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration;
    },
  });

  const swSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

  /** Browsers may not re-check sw.js until a navigation; nudge when the tab becomes visible. */
  useEffect(() => {
    if (!swSupported) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void registrationRef.current?.update();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [swSupported]);

  const checkForUpdate = useCallback(async () => {
    if (!swSupported) return;
    const reg = registrationRef.current ?? (await navigator.serviceWorker.getRegistration());
    await reg?.update();
  }, [swSupported]);

  const wrappedUpdate = useCallback(() => updateServiceWorker(), [updateServiceWorker]);

  const value = useMemo<PwaUpdateContextValue>(
    () => ({
      needRefresh,
      updateServiceWorker: wrappedUpdate,
      checkForUpdate,
      appVersion: import.meta.env.VITE_APP_VERSION,
      swSupported,
    }),
    [needRefresh, wrappedUpdate, checkForUpdate, swSupported],
  );

  return (
    <PwaUpdateContext.Provider value={value}>
      {children}
      <PwaUpdateToast />
    </PwaUpdateContext.Provider>
  );
}

export function usePwaUpdate(): PwaUpdateContextValue {
  const ctx = useContext(PwaUpdateContext);
  if (!ctx) {
    throw new Error('usePwaUpdate must be used within PwaUpdateProvider');
  }
  return ctx;
}
