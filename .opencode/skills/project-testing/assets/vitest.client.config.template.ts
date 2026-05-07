import { defineConfig } from 'vitest/config'

/**
 * Dedicated Vitest config for client/UI tests only (pnpm test:client).
 * Required because Vitest 4's --project flag does not filter inline test.projects.
 */
export default defineConfig({
  test: {
    name: 'client',
    environment: 'happy-dom',
    include: ['src/**/*.test.tsx'],
    setupFiles: ['./vitest.client.setup.ts'],
  },
})
