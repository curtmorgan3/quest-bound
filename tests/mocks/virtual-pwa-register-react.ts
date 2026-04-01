import { useState } from 'react';

/**
 * Stub for vite-plugin-pwa's virtual module during Vitest (plugin is not applied in test config).
 */
export function useRegisterSW(_options?: {
  immediate?: boolean;
  onRegisteredSW?: (
    _url: string,
    _registration: ServiceWorkerRegistration | undefined,
  ) => void;
}) {
  const [needRefresh] = useState(false);
  return {
    needRefresh: [needRefresh, () => {}] as const,
    offlineReady: [false, () => {}] as const,
    updateServiceWorker: async (_reload?: boolean) => {},
  };
}
