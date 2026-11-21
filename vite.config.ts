import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { financeApiPlugin } from './src/server/apiPlugin';
import pkg from './package.json';

export default defineConfig({
  plugins: [react(), tailwindcss(), financeApiPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    modulePreload: {
      polyfill: true,
    },
  },
  resolve: {
    alias: {
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@': path.resolve(__dirname, './src/app'),
    },
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 8443,
    host: true,
  },
});
