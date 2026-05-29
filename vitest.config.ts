import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: ['tests/**/*.test.ts', 'apps/**/*.test.ts'],
          environment: 'node'
        }
      },
      {
        test: {
          name: 'jsdom',
          include: ['tests/**/*.test.tsx', 'apps/**/*.test.tsx'],
          environment: 'jsdom'
        }
      }
    ]
  }
})
