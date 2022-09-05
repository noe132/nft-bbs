import { readFile } from 'fs/promises';
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

  const cert = await readFile('../../cert/cert.pem').catch(() => null);
  const key = await readFile('../../cert/key.pem').catch(() => null);

  return defineConfig({
    server: {
      host: '0.0.0.0',
      port: 8904,
      https: cert && key ? {
        cert,
        key,
      } : undefined,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8002',
        },
        '/socket.io': {
          ws: true,
          target: 'http://127.0.0.1:8002',
        },
      },
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
    esbuild: {
      // https://github.com/vitejs/vite/issues/8644#issuecomment-1159308803
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
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
