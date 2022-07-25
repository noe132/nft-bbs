import { join } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import checker from 'vite-plugin-checker';
import { svgInline } from './build/svg-inline';
import { svgrPlugin } from './build/vite-svgr-plugin';

// https://vitejs.dev/config/
export default async () => {
  const a = !!process.env.analyze;

  return defineConfig({
    server: {
      host: '0.0.0.0',
      port: 8904,
    },
    publicDir: join(__dirname, 'public'),
    resolve: {
      alias: {
        '~': join(__dirname, 'src'),
      },
    },
    define: {
      'process.env.SSR': JSON.stringify(''),
    },
    plugins: [
      checker({
        typescript: true,
        eslint: {
          lintCommand: 'eslint "./src/**/*.{ts,tsx,js,jsx}"',
        },
        overlay: false,
      }),
      react(),
      a && visualizer({
        filename: join(__dirname, 'dist/stats.html'),
        open: true,
      }),
      svgInline(),
      svgrPlugin(),
    ],
  });
};
