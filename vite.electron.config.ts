import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    ssr: true,
    outDir: 'dist-electron',
    target: 'node22',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'electron/main.ts'),
        preload: path.resolve(__dirname, 'electron/preload.ts'),
        server: path.resolve(__dirname, 'electron/server.ts'),
      },
      external: ['electron', 'better-sqlite3'],
      output: {
        entryFileNames: '[name].cjs',
        format: 'cjs',
      },
    },
  },
  ssr: {
    noExternal: true,
    external: ['electron', 'better-sqlite3'],
  },
  resolve: {
    alias: {
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@': path.resolve(__dirname, './src/app'),
    },
  },
});
