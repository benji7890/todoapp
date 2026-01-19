import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    react(),
    swc.vite({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
          tsx: true,
        },
        transform: {
          decoratorMetadata: true,
          react: {
            runtime: 'automatic',
          },
        },
        target: 'es2020',
      },
      module: {
        type: 'es6',
      },
    }),
  ],
  test: {
    globals: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
  },
});