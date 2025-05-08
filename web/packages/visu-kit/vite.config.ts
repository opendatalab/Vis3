
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [peerDepsExternal() as any, svgr()],
  build: {
    target: 'esnext',
    lib: {
      entry: 'src/index.ts',
      name: 'VisuKit',
      formats: ['es', 'umd'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'antd'],
    },
  },
  define: {
    global: 'window',
  },
});
