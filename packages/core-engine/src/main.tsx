import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { PwaUpdateProvider } from '@/pwa/pwa-update-provider';
import App from './App.tsx';
import { initAnalytics } from './lib/analytics';
import './index.css';
import './stores/loggers/global-error-handler';

initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PwaUpdateProvider>
      <App />
    </PwaUpdateProvider>
  </StrictMode>,
);
