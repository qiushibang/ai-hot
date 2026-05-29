import { describe, expect, test, vi } from 'vitest'

import {
  checkPort,
  detectRunningBrowsers,
  findFallbackCdpPort,
  knownBrowsers,
  readDevToolsActivePort
} from '../../apps/companion-service/src/browser/profile/browserDiscovery'

describe('knownBrowsers', () => {
  test('returns macOS browser definitions', () => {
    const browsers = knownBrowsers()

    expect(browsers.length).toBeGreaterThanOrEqual(4)
    expect(browsers[0]!.id).toBe('google chrome')
    expect(browsers[0]!.label).toBe('Chrome')
    expect(browsers[0]!.userDataDir).toContain('Google/Chrome')
    expect(browsers[0]!.devToolsActivePortPath).toContain('DevToolsActivePort')
  })

  test('every browser has a devToolsActivePortPath', () => {
    const browsers = knownBrowsers()

    for (const browser of browsers) {
      expect(browser.devToolsActivePortPath).toBeTruthy()
      expect(browser.executablePath).toBeTruthy()
      expect(browser.userDataDir).toBeTruthy()
    }
  })
})

describe('readDevToolsActivePort', () => {
  test('returns null when file does not exist', async () => {
    const result = await readDevToolsActivePort('/tmp/nonexistent-dev-tools-active-port')

    expect(result).toBeNull()
  })
})

describe('detectRunningBrowsers', () => {
  test('returns empty array when no browser has DevToolsActivePort file', async () => {
    const fileExists = vi.fn().mockResolvedValue(false)

    const result = await detectRunningBrowsers(fileExists)

    expect(result).toEqual([])
    expect(fileExists).toHaveBeenCalled()
  })
})

describe('findFallbackCdpPort', () => {
  test('returns null or number (no fallback ports typically listening in test)', async () => {
    const port = await findFallbackCdpPort()

    expect(port === null || typeof port === 'number').toBe(true)
  })
})

describe('checkPort', () => {
  test('resolves false for a port not in use', async () => {
    const result = await checkPort(19999)

    expect(result).toBe(false)
  })
})