import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
) as { version: string };

// https://vite.dev/config/
export const viteConfig = defineConfig({
  /** Monorepo: keep a single `.env` at the repo root; default would only load `packages/core-engine/.env`. */
  envDir: path.resolve(__dirname, '../..'),
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      /** Custom registration in `PwaUpdateProvider` (workbox-window). Do not inject `registerSW.js` — it only calls `register()` on `load` with no update listeners and can prevent the prompt toast from firing. */
      injectRegister: false,
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Quest Bound',
        short_name: 'Quest Bound',
        description: 'A quest management application',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,mp4}'],
        /** SPA shell for navigations (incl. deep links / refresh). Never use `offline.html` here — Workbox serves it for every document request, so non-root routes looked "offline" even online. */
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 6 MiB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: [
      {
        find: /^@\/pages\/characters$/,
        replacement: path.resolve(__dirname, '../runtime/src/pages/characters/index.ts'),
      },
      {
        find: /^@\/pages\/characters\/(.+)$/,
        replacement: path.resolve(__dirname, '../runtime/src/pages/characters/$1'),
      },
      {
        find: /^@\/pages\/campaigns$/,
        replacement: path.resolve(__dirname, '../runtime/src/pages/campaigns/index.ts'),
      },
      {
        find: /^@\/pages\/campaigns\/(.+)$/,
        replacement: path.resolve(__dirname, '../runtime/src/pages/campaigns/$1'),
      },
      {
        find: /^@\/pages\/dice$/,
        replacement: path.resolve(__dirname, '../runtime/src/pages/dice/index.ts'),
      },
      {
        find: /^@\/pages\/dice\/(.+)$/,
        replacement: path.resolve(__dirname, '../runtime/src/pages/dice/$1'),
      },
      {
        find: /^@\/components\/(.+)$/,
        replacement: path.resolve(__dirname, '../core-ui/src/$1'),
      },
      {
        find: /^@\/components$/,
        replacement: path.resolve(__dirname, '../core-ui/src/index.ts'),
      },
      {
        find: /^@\/lib\/compass-logic\/(.+)$/,
        replacement: path.resolve(__dirname, '../qbscript/src/$1'),
      },
      {
        find: /^@\/lib\/compass-logic$/,
        replacement: path.resolve(__dirname, '../qbscript/src/index.ts'),
      },
      {
        find: /^@\/lib\/cloud\/(.+)$/,
        replacement: path.resolve(__dirname, '../cloud/src/$1'),
      },
      {
        find: /^@\/lib\/cloud$/,
        replacement: path.resolve(__dirname, '../cloud/src/index.ts'),
      },
      {
        find: /^@\/lib\/campaign-play\/(.+)$/,
        replacement: path.resolve(__dirname, '../runtime/src/$1'),
      },
      {
        find: /^@\/lib\/campaign-play$/,
        replacement: path.resolve(__dirname, '../runtime/src/index.ts'),
      },
      {
        find: /^@\/lib\/compass-api\/hooks\/(.+)$/,
        replacement: path.resolve(__dirname, '../local-db/src/api-hooks/$1'),
      },
      {
        find: /^@\/lib\/compass-api\/hooks$/,
        replacement: path.resolve(__dirname, '../local-db/src/api-hooks/index.ts'),
      },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  /** Vite 7: default `iife` is invalid when the worker graph is code-split; ES module workers are fine for `type: 'module'`. */
  worker: {
    format: 'es',
  },
  server: (() => {
    const certDir = path.resolve(__dirname, '../../.cert');
    const keyPath = path.join(certDir, 'key.pem');
    const certPath = path.join(certDir, 'cert.pem');
    const useHttps = fs.existsSync(keyPath) && fs.existsSync(certPath);

    return {
      port: 5173,
      host: true,
      ...(useHttps && {
        https: {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        },
      }),
    };
  })(),
});

export default viteConfig;
