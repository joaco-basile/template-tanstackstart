import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'client',
    environment: 'happy-dom',
    include: ['src/**/*.test.tsx'],
    setupFiles: ['./vitest.client.setup.ts'],
  },
})
