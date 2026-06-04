import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { PwaUpdateProvider } from '@/pwa/pwa-update-provider';
import App from './App.tsx';
import './index.css';
import { initAnalytics } from './lib/analytics';
import './stores/loggers/global-error-handler';
import { usePwaInstallStore, type BeforeInstallPromptEvent } from './stores';

initAnalytics();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  usePwaInstallStore.getState().setDeferredPrompt(e as unknown as BeforeInstallPromptEvent);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PwaUpdateProvider>
      <App />
    </PwaUpdateProvider>
  </StrictMode>,
);
