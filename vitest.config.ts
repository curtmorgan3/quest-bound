import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: [
      {
        find: /^@\/components\/(.+)$/,
        replacement: path.resolve(__dirname, 'packages/core-ui/src/$1'),
      },
      {
        find: /^@\/components$/,
        replacement: path.resolve(__dirname, 'packages/core-ui/src/index.ts'),
      },
      {
        find: /^@\/lib\/compass-logic\/(.+)$/,
        replacement: path.resolve(__dirname, 'packages/qbscript/src/$1'),
      },
      {
        find: /^@\/lib\/compass-logic$/,
        replacement: path.resolve(__dirname, 'packages/qbscript/src/index.ts'),
      },
      {
        find: /^@\/lib\/cloud\/(.+)$/,
        replacement: path.resolve(__dirname, 'packages/cloud/src/$1'),
      },
      {
        find: /^@\/lib\/cloud$/,
        replacement: path.resolve(__dirname, 'packages/cloud/src/index.ts'),
      },
      {
        find: /^@\/lib\/campaign-play\/(.+)$/,
        replacement: path.resolve(__dirname, 'packages/runtime/src/$1'),
      },
      {
        find: /^@\/lib\/campaign-play$/,
        replacement: path.resolve(__dirname, 'packages/runtime/src/index.ts'),
      },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules/', 'cypress/', 'dist/'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'cypress/',
        'dist/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.config.ts',
        '**/types/',
        'src/components/ui/**',
      ],
    },
  },
});
