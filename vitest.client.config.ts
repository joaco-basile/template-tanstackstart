import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: { tsconfigPaths: true },
  test: {
    name: 'client',
    environment: 'happy-dom',
    include: ['src/**/*.test.tsx'],
    setupFiles: ['./vitest.client.setup.ts'],
  },
})
