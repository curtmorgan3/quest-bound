import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { PwaUpdateProvider } from '@/pwa/pwa-update-provider';
import App from './App.tsx';
import './index.css';
import { initAnalytics } from './lib/analytics';
import './stores/loggers/global-error-handler';

initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PwaUpdateProvider>
      <App />
    </PwaUpdateProvider>
  </StrictMode>,
);
