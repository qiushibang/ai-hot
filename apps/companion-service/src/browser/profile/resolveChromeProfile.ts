import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { detectRunningBrowsers } from './browserDiscovery'
import type { DetectedBrowser } from './browserDiscovery'
import { COMPANION_SERVICE_BROWSER_DIRECTORY } from '../../db/databasePath'

const DEFAULT_CHROME_EXECUTABLE =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const DEFAULT_CHROME_PROFILE = 'Default'

const resolveWebSocketDebuggerUrl = async ({
  userDataDir,
  port,
  exists,
  readFile: readFileDep
}: {
  userDataDir: string
  port: number
  exists: typeof defaultExists
  readFile: typeof defaultReadFile
}): Promise<string | null> => {
  const activePortPath = join(userDataDir, 'DevToolsActivePort')

  if (!(await exists(activePortPath))) {
    return null
  }

  try {
    const content = await readFileDep(activePortPath)
    const [, wsPath] = content.trim().split('\n')

    if (!wsPath) {
      return null
    }

    return `ws://127.0.0.1:${port}${wsPath}`
  } catch {
    return null
  }
}

type ResolveChromeProfileDependencies = {
  exists?: typeof defaultExists
  readFile?: typeof defaultReadFile
  homeDirectory?: string
  detectRunning?: typeof detectRunningBrowsers
}

type ChromeLocalState = {
  profile?: {
    last_used?: unknown
  }
}

export type ChromeProfileResolution = {
  isAvailable: boolean
  browserExecutablePath: string | null
  userDataDir: string | null
  profileDirectory: string | null
  automationUserDataDir: string
  remoteDebuggingUrl: string | null
  browserLabel: string | null
  reason: 'browser_unavailable' | 'profile_unavailable' | null
}

const defaultExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const defaultReadFile = async (path: string): Promise<string> => readFile(path, 'utf8')

const parseLastUsedProfile = (payload: string): string | null => {
  try {
    const parsedPayload = JSON.parse(payload) as ChromeLocalState
    const lastUsedProfile = parsedPayload?.profile?.last_used

    if (typeof lastUsedProfile !== 'string') {
      return null
    }

    const normalizedProfile = lastUsedProfile.trim()

    return normalizedProfile.length > 0 ? normalizedProfile : null
  } catch {
    return null
  }
}

const resolveProfileName = async ({
  userDataDir,
  readFile: readFileDependency
}: {
  userDataDir: string
  readFile: typeof defaultReadFile
}): Promise<string> => {
  try {
    const localStatePayload = await readFileDependency(join(userDataDir, 'Local State'))

    return parseLastUsedProfile(localStatePayload) ?? DEFAULT_CHROME_PROFILE
  } catch {
    return DEFAULT_CHROME_PROFILE
  }
}

const makeResolution = (
  overrides: Partial<ChromeProfileResolution>
): ChromeProfileResolution => ({
  isAvailable: false,
  browserExecutablePath: null,
  userDataDir: null,
  profileDirectory: null,
  automationUserDataDir: COMPANION_SERVICE_BROWSER_DIRECTORY,
  remoteDebuggingUrl: null,
  browserLabel: null,
  reason: null,
  ...overrides
})

const pickBestDetectedBrowser = (detected: DetectedBrowser[]): DetectedBrowser | undefined => {
  const preferenceOrder = ['google chrome', 'chromium', 'microsoft edge', 'google chrome canary']
  let best: DetectedBrowser | undefined
  let bestRank = Infinity
  for (const browser of detected) {
    const rank = preferenceOrder.indexOf(browser.id)
    const effectiveRank = rank === -1 ? preferenceOrder.length : rank
    if (effectiveRank < bestRank) {
      bestRank = effectiveRank
      best = browser
    }
  }
  return best
}

export const resolveChromeProfile = async ({
  exists = defaultExists,
  readFile: readFileDependency = defaultReadFile,
  homeDirectory = process.env.HOME ?? '',
  detectRunning = detectRunningBrowsers
}: ResolveChromeProfileDependencies = {}): Promise<ChromeProfileResolution> => {
  const automationUserDataDir = COMPANION_SERVICE_BROWSER_DIRECTORY

  const running = await detectRunning(exists)

  if (running.length > 0) {
    const best = pickBestDetectedBrowser(running)!

    const userDataDir = best.userDataDir
    const profileName = await resolveProfileName({
      userDataDir,
      readFile: readFileDependency
    })
    const profileDirectory = join(userDataDir, profileName)

    const wsUrl = await resolveWebSocketDebuggerUrl({
      userDataDir,
      port: best.remoteDebuggingPort,
      exists,
      readFile: readFileDependency
    })

    return makeResolution({
      isAvailable: true,
      browserExecutablePath: best.executablePath,
      userDataDir,
      profileDirectory: (await exists(profileDirectory)) ? profileDirectory : null,
      remoteDebuggingUrl: wsUrl ?? `http://127.0.0.1:${best.remoteDebuggingPort}`,
      browserLabel: best.label,
      reason: null
    })
  }

  const userDataDir = join(homeDirectory, 'Library/Application Support/Google/Chrome')

  if (!(await exists(DEFAULT_CHROME_EXECUTABLE))) {
    return makeResolution({ browserExecutablePath: DEFAULT_CHROME_EXECUTABLE, userDataDir, reason: 'browser_unavailable' })
  }

  const profileName = await resolveProfileName({
    userDataDir,
    readFile: readFileDependency
  })
  const profileDirectory = join(userDataDir, profileName)

  if (!(await exists(profileDirectory))) {
    return makeResolution({
      browserExecutablePath: DEFAULT_CHROME_EXECUTABLE,
      userDataDir,
      reason: 'profile_unavailable'
    })
  }

  return makeResolution({
    isAvailable: true,
    browserExecutablePath: DEFAULT_CHROME_EXECUTABLE,
    userDataDir,
    profileDirectory,
    automationUserDataDir,
    reason: null
  })
}