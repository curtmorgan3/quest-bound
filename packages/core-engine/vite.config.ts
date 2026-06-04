import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
) as { version: string };

const envDir = path.resolve(__dirname, '../..');

// https://vite.dev/config/
export const viteConfig = defineConfig(({ mode }) => {
  /** Load env files from the monorepo root so game vars are available at config time. */
  const env = loadEnv(mode, envDir, '');
  const isGameMode = env.VITE_GAME_MODE === 'true';

  const gameName = isGameMode ? (env.VITE_GAME_NAME || 'Quest Bound') : 'Quest Bound';
  const gameShortName = isGameMode ? (env.VITE_GAME_SHORT_NAME || gameName) : 'Quest Bound';
  const gameDescription = isGameMode
    ? (env.VITE_GAME_DESCRIPTION || 'A tabletop game')
    : 'A quest management application';
  const gameThemeColor = isGameMode ? (env.VITE_GAME_THEME_COLOR || '#000000') : '#000000';
  /** True when the caller placed game-assets/icon.png and the build script copied it here. */
  const hasGameIcon =
    isGameMode && fs.existsSync(path.resolve(__dirname, 'public/icons/game-icon.png'));

  const pwaIcons = hasGameIcon
    ? [
        { src: '/icons/game-icon.png', sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
        { src: '/icons/game-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' },
      ]
    : [
        { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ];

  return {
    /** Monorepo: keep a single `.env` at the repo root; default would only load `packages/core-engine/.env`. */
    envDir,
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
      ...(isGameMode && {
        'import.meta.env.VITE_GAME_MODE': JSON.stringify('true'),
        'import.meta.env.VITE_GAME_ID': JSON.stringify(env.VITE_GAME_ID ?? ''),
        'import.meta.env.VITE_GAME_SLUG': JSON.stringify(env.VITE_GAME_SLUG ?? ''),
        'import.meta.env.VITE_EDIT_MODE': JSON.stringify(env.VITE_EDIT_MODE ?? 'true'),
        'import.meta.env.VITE_GAME_NAME': JSON.stringify(gameName),
        'import.meta.env.VITE_GAME_SHORT_NAME': JSON.stringify(gameShortName),
        'import.meta.env.VITE_GAME_DESCRIPTION': JSON.stringify(gameDescription),
        'import.meta.env.VITE_GAME_THEME_COLOR': JSON.stringify(gameThemeColor),
      }),
    },
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(),
      ...(isGameMode
        ? [
            {
              name: 'game-mode-html',
              transformIndexHtml(html: string): string {
                let result = html
                  .replace(/<title>.*?<\/title>/, `<title>${gameName}</title>`)
                  .replace(
                    /(<meta name="apple-mobile-web-app-title" content=")([^"]*)(")/,
                    `$1${gameName}$3`,
                  )
                  .replace(
                    /(<meta name="theme-color" content=")([^"]*)(")/,
                    `$1${gameThemeColor}$3`,
                  )
                  .replace(
                    /(<meta name="description" content=")([^"]*)(")/,
                    `$1${gameDescription}$3`,
                  )
                  // Remove the static manifest link — VitePWA injects its own manifest.webmanifest
                  .replace(/<link rel="manifest" href="\/manifest\.json" \/>/, '');
                if (hasGameIcon) {
                  result = result
                    .replace(
                      /(<link rel="apple-touch-icon" href=")([^"]*)(")/,
                      `$1/icons/game-icon.png$3`,
                    )
                    .replace(
                      /<link rel="icon" type="image\/svg\+xml" href="[^"]*"/,
                      '<link rel="icon" type="image/png" href="/icons/game-icon.png"',
                    )
                    .replace(
                      /<link rel="icon" type="image\/png" sizes="192x192" href="[^"]*"/,
                      '<link rel="icon" type="image/png" sizes="192x192" href="/icons/game-icon.png"',
                    )
                    .replace(
                      /<link rel="icon" type="image\/png" sizes="512x512" href="[^"]*"/,
                      '<link rel="icon" type="image/png" sizes="512x512" href="/icons/game-icon.png"',
                    );
                }
                return result;
              },
            },
          ]
        : []),
      VitePWA({
        /** Custom registration in `PwaUpdateProvider` (workbox-window). Do not inject `registerSW.js` — it only calls `register()` on `load` with no update listeners and can prevent the prompt toast from firing. */
        injectRegister: false,
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: gameName,
          short_name: gameShortName,
          description: gameDescription,
          theme_color: gameThemeColor,
          background_color: '#000000',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          icons: pwaIcons,
        },
        workbox: {
          /** Include font extensions so @font-face assets (e.g. CygnitoMonoPro) are precached for offline PWA. */
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,otf,ttf,mp4}'],
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
  };
});

export default viteConfig;
