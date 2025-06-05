import { resolve } from 'path';

import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import svgr from 'vite-plugin-svgr';
import tsMonoAlias from 'vite-plugin-ts-mono-alias';

const visuAppDir = resolve(__dirname, '../..', 'ovisu/static')

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  publicDir: resolve(__dirname, 'public'),
  envDir: resolve(__dirname, 'env'),
  build: {
    outDir: visuAppDir,
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      // '/api': {
      //   target: 'https://data-workbench-dev.dc.shlab.tech',
      //   changeOrigin: true,
      //   secure: false,
      // },
      '/api/': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  optimizeDeps: {
    include: ['react/jsx-runtime'],
  },

  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    tailwindcss(),
    react(),
    svgr(),
    ViteEjsPlugin(),
    tsMonoAlias.default(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/'),
    },
  },
});
