import { config } from 'dotenv'
config({ path: '.env.test' })

import { defineConfig } from 'vitest/config'

/**
 * Root Vitest config for running ALL tests (pnpm test).
 * Uses test.projects to run both server and client suites in parallel.
 */
export default defineConfig({
  test: {
    projects: [
      {
        name: 'server',
        environment: 'node',
        include: [
          'src/**/*.server.test.ts',
          'src/**/*.schema.test.ts',
          'src/lib/**/*.test.ts',
        ],
        setupFiles: ['./vitest.server.setup.ts'],
      },
      {
        name: 'client',
        environment: 'happy-dom',
        include: ['src/**/*.test.tsx'],
        setupFiles: ['./vitest.client.setup.ts'],
      },
    ],
  },
})
