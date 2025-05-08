import { resolve } from 'path';

import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [peerDepsExternal() as PluginOption],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'VisuI18n',
      formats: ['es', 'umd'],
      fileName: 'index',
    },
  },
  resolve: {
    alias: {
      '@/': resolve(__dirname, 'src'),
    },
  },
});
