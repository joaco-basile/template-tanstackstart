import { config } from 'dotenv'
config({ path: '.env.test' })

import { defineConfig } from 'vitest/config'

/**
 * Dedicated Vitest config for server tests only (pnpm test:server).
 * Required because Vitest 4's --project flag does not filter inline test.projects.
 */
export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    include: [
      'src/**/*.server.test.ts',
      'src/**/*.schema.test.ts',
      'src/lib/**/*.test.ts',
    ],
    setupFiles: ['./vitest.server.setup.ts'],
  },
})
