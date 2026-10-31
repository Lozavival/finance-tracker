import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    ssr: 'electron/main.ts',
    outDir: 'dist-electron',
    target: 'node22',
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron', 'better-sqlite3'],
      output: {
        entryFileNames: 'main.cjs',
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
