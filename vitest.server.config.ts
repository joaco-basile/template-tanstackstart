import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: { tsconfigPaths: true },
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
