import { defineConfig } from 'vitest/config';
import path from 'path';

function fixAssetsIncludePlugin() {
  return {
    name: 'fix-assets-include',
    config(config: any) {
      if (typeof config.assetsInclude === 'function') {
        delete config.assetsInclude;
      }
    },
  };
}

export default defineConfig({
  plugins: [fixAssetsIncludePlugin()],
  test: {
    projects: [
      {
        test: {
          name: 'node-tests',
          include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
          exclude: ['tests/unit/hooks/**'],
          environment: 'node',
          alias: {
            '@/styles': path.resolve(__dirname, './src/styles'),
            '@': path.resolve(__dirname, './src/app'),
          },
        },
      },
      {
        test: {
          name: 'dom-tests',
          include: [
            'tests/components/**/*.test.tsx',
            'tests/components/**/*.test.ts',
            'tests/integration/state/**/*.test.tsx',
            'tests/unit/hooks/**/*.test.ts',
            'tests/unit/hooks/**/*.test.tsx',
          ],
          environment: 'happy-dom',
          setupFiles: ['./tests/helpers/setup-jsdom.ts'],
          alias: {
            '@/styles': path.resolve(__dirname, './src/styles'),
            '@': path.resolve(__dirname, './src/app'),
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/app/data/**', 'src/app/state/**', 'src/server/**', 'src/db/**'],
      exclude: ['src/app/data/fixtures/**', 'src/vite-env.d.ts'],
    },
  },
});
