import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import packageJson from '../../package.json'
import tsconfigBase from '../../tsconfig.base.json'

describe('workspace bootstrap', () => {
  test('defines bootstrap scripts and package manager', () => {
    expect(packageJson.packageManager).toBe('pnpm@10.0.0')
    expect(packageJson.scripts.test).toBe('vitest run')
    expect(packageJson.scripts.typecheck).toBe('tsc -p tsconfig.base.json --noEmit')
    expect(packageJson.scripts.lint).toContain('eslint .')
  })

  test('defines workspace packages and test config', () => {
    const workspaceConfig = readFileSync(new URL('../../pnpm-workspace.yaml', import.meta.url), 'utf8')
    const vitestConfig = readFileSync(new URL('../../vitest.config.ts', import.meta.url), 'utf8')
    const playwrightConfig = readFileSync(new URL('../../playwright.config.ts', import.meta.url), 'utf8')

    expect(workspaceConfig).toContain('- apps/*')
    expect(workspaceConfig).toContain('- packages/*')
    expect(vitestConfig).toContain("environment: 'node'")
    expect(playwrightConfig).toContain("testDir: './tests/e2e'")
  })

  test('typecheck config includes the current workspace source files', () => {
    expect(tsconfigBase.include).toEqual([
      'tests/**/*.ts',
      'tests/**/*.tsx',
      'apps/**/*.ts',
      'apps/**/*.tsx',
      'packages/**/*.ts',
      'packages/**/*.tsx',
      '*.ts',
      '*.js'
    ])
    expect(tsconfigBase.compilerOptions.noEmit).toBe(true)
    expect(tsconfigBase.compilerOptions.types).toContain('vitest/globals')
  })
})
