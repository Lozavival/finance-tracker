/* eslint-disable no-console */
import { defineConfig } from 'vitest/config';
import { createLogger } from 'vite';
import path from 'path';

// Filter out Vite 6 deprecation warning that is emitted by internal default environments
const origStderrWrite = process.stderr.write.bind(process.stderr);
// @ts-expect-error patching stderr.write to suppress harmless Vite deprecation noise
process.stderr.write = (chunk: any, ...args: any[]) => {
  if (typeof chunk === 'string' && chunk.includes('polyfillModulePreload is deprecated')) {
    return true;
  }
  return origStderrWrite(chunk, ...args);
};

const origWarn = console.warn.bind(console);
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('polyfillModulePreload is deprecated')) {
    return;
  }
  origWarn(...args);
};

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

const customLogger = (() => {
  const logger = createLogger();
  const originalWarn = logger.warn.bind(logger);
  logger.warn = (msg, options) => {
    if (typeof msg === 'string' && msg.includes('polyfillModulePreload is deprecated')) {
      return;
    }
    originalWarn(msg, options);
  };
  return logger;
})();

export default defineConfig({
  customLogger,
  plugins: [fixAssetsIncludePlugin()],
  build: {
    modulePreload: {
      polyfill: true,
    },
  },
  test: {
    silent: true,
    onConsoleLog: () => false,
    projects: [
      {
        customLogger,
        test: {
          name: 'node-tests',
          include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
          exclude: ['tests/unit/hooks/**'],
          environment: 'node',
          silent: true,
          onConsoleLog: () => false,
          alias: {
            '@/styles': path.resolve(__dirname, './src/styles'),
            '@': path.resolve(__dirname, './src/app'),
          },
        },
      },
      {
        customLogger,
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
          silent: true,
          onConsoleLog: () => false,
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
