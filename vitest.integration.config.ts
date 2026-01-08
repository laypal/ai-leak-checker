import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['tests/unit/**', 'tests/e2e/**', 'tests/property/**'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    // Integration tests run sequentially to avoid race conditions
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@detectors': resolve(__dirname, 'src/shared/detectors'),
      '@types': resolve(__dirname, 'src/shared/types'),
      '@utils': resolve(__dirname, 'src/shared/utils'),
    },
  },
});
