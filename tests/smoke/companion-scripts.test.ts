import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const readScript = (relativePath: string) => {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8')
}

describe('companion service shell scripts', () => {
  test('defines a startup script for the local companion service', () => {
    // Arrange
    const startupScriptPath = new URL('../../scripts/start-companion.sh', import.meta.url)

    // Act
    const hasStartupScript = existsSync(startupScriptPath)

    // Assert
    expect(hasStartupScript).toBe(true)
    expect(readScript('scripts/start-companion.sh')).toContain('#!/usr/bin/env bash')
    expect(readScript('scripts/start-companion.sh')).toContain('set -euo pipefail')
    expect(readScript('scripts/start-companion.sh')).toContain('pnpm start:companion-service')
  })

  test('defines a macOS installer script for local setup', () => {
    // Arrange
    const installerScriptPath = new URL('../../scripts/install-companion-mac.sh', import.meta.url)

    // Act
    const hasInstallerScript = existsSync(installerScriptPath)

    // Assert
    expect(hasInstallerScript).toBe(true)
    expect(readScript('scripts/install-companion-mac.sh')).toContain('#!/usr/bin/env bash')
    expect(readScript('scripts/install-companion-mac.sh')).toContain('set -euo pipefail')
    expect(readScript('scripts/install-companion-mac.sh')).toContain('Darwin')
    expect(readScript('scripts/install-companion-mac.sh')).toContain('pnpm install')
    expect(readScript('scripts/install-companion-mac.sh')).toContain('scripts/start-companion.sh')
  })
})
