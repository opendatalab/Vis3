import { resolve } from 'path';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ['react/jsx-runtime'],
    exclude: ['@vis3/kit'],
  },

  plugins: [react(), svgr() as any],
  server: {
    fs: {
      allow: [resolve(__dirname, '..')],
    },
  },
  build: {
    target: 'es2015',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@vis3/kit': resolve(__dirname, '../src/index.ts'),
    },
  },
});
