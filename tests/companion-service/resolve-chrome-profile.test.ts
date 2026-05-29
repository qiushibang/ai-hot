import { describe, expect, test, vi } from 'vitest'

import { resolveChromeProfile } from '../../apps/companion-service/src/browser/profile/resolveChromeProfile'
import type { DetectedBrowser } from '../../apps/companion-service/src/browser/profile/browserDiscovery'
import { COMPANION_SERVICE_BROWSER_DIRECTORY } from '../../apps/companion-service/src/db/databasePath'

const TEST_HOME_DIRECTORY = '/Users/test'
const TEST_USER_DATA_DIR = `${TEST_HOME_DIRECTORY}/Library/Application Support/Google/Chrome`
const TEST_LOCAL_STATE_PATH = `${TEST_USER_DATA_DIR}/Local State`
const TEST_DEFAULT_PROFILE_DIRECTORY = `${TEST_USER_DATA_DIR}/Default`
const TEST_PROFILE_1_DIRECTORY = `${TEST_USER_DATA_DIR}/Profile 1`
const TEST_CHROME_EXECUTABLE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const noRunning = vi.fn().mockResolvedValue([])

describe('resolveChromeProfile', () => {
  test('returns the last-used Chrome profile when Local State points to a non-default profile', async () => {
    const resolution = await resolveChromeProfile({
      exists: async (path) =>
        path === TEST_CHROME_EXECUTABLE || path === TEST_PROFILE_1_DIRECTORY,
      homeDirectory: TEST_HOME_DIRECTORY,
      readFile: async (path) => {
        expect(path).toBe(TEST_LOCAL_STATE_PATH)

        return JSON.stringify({
          profile: {
            last_used: 'Profile 1'
          }
        })
      },
      detectRunning: noRunning
    })

    expect(resolution).toEqual({
      isAvailable: true,
      browserExecutablePath: TEST_CHROME_EXECUTABLE,
      userDataDir: TEST_USER_DATA_DIR,
      profileDirectory: TEST_PROFILE_1_DIRECTORY,
      automationUserDataDir: COMPANION_SERVICE_BROWSER_DIRECTORY,
      remoteDebuggingUrl: null,
      browserLabel: null,
      reason: null
    })
  })

  test('falls back to the Default profile when Local State is invalid', async () => {
    const resolution = await resolveChromeProfile({
      exists: async (path) =>
        path === TEST_CHROME_EXECUTABLE || path === TEST_DEFAULT_PROFILE_DIRECTORY,
      homeDirectory: TEST_HOME_DIRECTORY,
      readFile: async () => '{',
      detectRunning: noRunning
    })

    expect(resolution).toEqual({
      isAvailable: true,
      browserExecutablePath: TEST_CHROME_EXECUTABLE,
      userDataDir: TEST_USER_DATA_DIR,
      profileDirectory: TEST_DEFAULT_PROFILE_DIRECTORY,
      automationUserDataDir: COMPANION_SERVICE_BROWSER_DIRECTORY,
      remoteDebuggingUrl: null,
      browserLabel: null,
      reason: null
    })
  })

  test('returns the app-owned automation directory even when the Chrome profile is unavailable', async () => {
    const resolution = await resolveChromeProfile({
      exists: async (path) => path === TEST_CHROME_EXECUTABLE,
      homeDirectory: TEST_HOME_DIRECTORY,
      readFile: async () =>
        JSON.stringify({
          profile: {
            last_used: 'Profile 1'
          }
        }),
      detectRunning: noRunning
    })

    expect(resolution).toEqual({
      isAvailable: false,
      browserExecutablePath: TEST_CHROME_EXECUTABLE,
      userDataDir: TEST_USER_DATA_DIR,
      profileDirectory: null,
      automationUserDataDir: COMPANION_SERVICE_BROWSER_DIRECTORY,
      remoteDebuggingUrl: null,
      browserLabel: null,
      reason: 'profile_unavailable'
    })
  })

  test('returns remoteDebuggingUrl when a running browser is detected via DevToolsActivePort', async () => {
    const detected: DetectedBrowser = {
      id: 'google chrome',
      label: 'Chrome',
      executablePath: TEST_CHROME_EXECUTABLE,
      userDataDir: TEST_USER_DATA_DIR,
      devToolsActivePortPath: `${TEST_USER_DATA_DIR}/DevToolsActivePort`,
      remoteDebuggingPort: 9222,
      wsPath: '/devtools/browser/some-id'
    }

    const resolution = await resolveChromeProfile({
      exists: async (path) =>
        path === TEST_CHROME_EXECUTABLE || path === TEST_DEFAULT_PROFILE_DIRECTORY,
      homeDirectory: TEST_HOME_DIRECTORY,
      readFile: async () =>
        JSON.stringify({
          profile: {
            last_used: 'Default'
          }
        }),
      detectRunning: vi.fn().mockResolvedValue([detected])
    })

    expect(resolution).toEqual({
      isAvailable: true,
      browserExecutablePath: TEST_CHROME_EXECUTABLE,
      userDataDir: TEST_USER_DATA_DIR,
      profileDirectory: TEST_DEFAULT_PROFILE_DIRECTORY,
      automationUserDataDir: COMPANION_SERVICE_BROWSER_DIRECTORY,
      remoteDebuggingUrl: 'http://127.0.0.1:9222',
      browserLabel: 'Chrome',
      reason: null
    })
  })

  test('returns browser_unavailable when Chrome executable does not exist and no running browser', async () => {
    const resolution = await resolveChromeProfile({
      exists: async () => false,
      homeDirectory: TEST_HOME_DIRECTORY,
      readFile: async () => '',
      detectRunning: noRunning
    })

    expect(resolution).toEqual({
      isAvailable: false,
      browserExecutablePath: TEST_CHROME_EXECUTABLE,
      userDataDir: TEST_USER_DATA_DIR,
      profileDirectory: null,
      automationUserDataDir: COMPANION_SERVICE_BROWSER_DIRECTORY,
      remoteDebuggingUrl: null,
      browserLabel: null,
      reason: 'browser_unavailable'
    })
  })
})