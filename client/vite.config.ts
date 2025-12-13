import tailwindcss from '@tailwindcss/vite';
import reactPlugin from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [reactPlugin({ jsxRuntime: 'automatic' }), tsconfigPaths(), tailwindcss()],
    build: {
      sourcemap: env.VITE_ENV !== 'dev',
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name].js`,
          chunkFileNames: `assets/[name].js`,
          assetFileNames: `assets/[name].[ext]`,
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    define: {
      'window.global': {},
    },
  };
});
