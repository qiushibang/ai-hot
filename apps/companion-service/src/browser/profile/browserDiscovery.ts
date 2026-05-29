import { readFile, access } from 'node:fs/promises'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'
import { createConnection } from 'node:net'

export type KnownBrowser = {
  id: string
  label: string
  executablePath: string
  userDataDir: string
  devToolsActivePortPath: string
}

const HOME = homedir()
const LOCAL_APP_DATA = process.env.LOCALAPPDATA ?? ''
const OS = platform()

const BROWSER_DEFINITIONS: Record<string, Omit<KnownBrowser, 'id' | 'label'>[]> = {
  darwin: [
    {
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: join(HOME, 'Library/Application Support/Google/Chrome'),
      devToolsActivePortPath: join(HOME, 'Library/Application Support/Google/Chrome/DevToolsActivePort')
    },
    {
      executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      userDataDir: join(HOME, 'Library/Application Support/Google/Chrome Canary'),
      devToolsActivePortPath: join(HOME, 'Library/Application Support/Google/Chrome Canary/DevToolsActivePort')
    },
    {
      executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium',
      userDataDir: join(HOME, 'Library/Application Support/Chromium'),
      devToolsActivePortPath: join(HOME, 'Library/Application Support/Chromium/DevToolsActivePort')
    },
    {
      executablePath: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      userDataDir: join(HOME, 'Library/Application Support/Microsoft Edge'),
      devToolsActivePortPath: join(HOME, 'Library/Application Support/Microsoft Edge/DevToolsActivePort')
    }
  ],
  linux: [
    {
      executablePath: 'google-chrome',
      userDataDir: join(HOME, '.config/google-chrome'),
      devToolsActivePortPath: join(HOME, '.config/google-chrome/DevToolsActivePort')
    },
    {
      executablePath: 'chromium',
      userDataDir: join(HOME, '.config/chromium'),
      devToolsActivePortPath: join(HOME, '.config/chromium/DevToolsActivePort')
    },
    {
      executablePath: 'microsoft-edge',
      userDataDir: join(HOME, '.config/microsoft-edge'),
      devToolsActivePortPath: join(HOME, '.config/microsoft-edge/DevToolsActivePort')
    }
  ],
  win32: [
    {
      executablePath: join(LOCAL_APP_DATA, 'Google/Chrome/Application/chrome.exe'),
      userDataDir: join(LOCAL_APP_DATA, 'Google/Chrome/User Data'),
      devToolsActivePortPath: join(LOCAL_APP_DATA, 'Google/Chrome/User Data/DevToolsActivePort')
    },
    {
      executablePath: join(LOCAL_APP_DATA, 'Chromium/Application/chrome.exe'),
      userDataDir: join(LOCAL_APP_DATA, 'Chromium/User Data'),
      devToolsActivePortPath: join(LOCAL_APP_DATA, 'Chromium/User Data/DevToolsActivePort')
    },
    {
      executablePath: join(LOCAL_APP_DATA, 'Microsoft/Edge/Application/msedge.exe'),
      userDataDir: join(LOCAL_APP_DATA, 'Microsoft/Edge/User Data'),
      devToolsActivePortPath: join(LOCAL_APP_DATA, 'Microsoft/Edge/User Data/DevToolsActivePort')
    }
  ]
}

const BROWSER_LABELS: Record<number, string> = {
  0: 'Chrome',
  1: 'Chrome Canary',
  2: 'Chromium',
  3: 'Edge'
}

export const knownBrowsers = (): KnownBrowser[] => {
  const defs = BROWSER_DEFINITIONS[OS] ?? []
  return defs.map((def, index) => ({
    ...def,
    id: def.executablePath.split('/').pop()?.replace('.exe', '')?.toLowerCase() ?? `browser-${index}`,
    label: BROWSER_LABELS[index] ?? `Browser ${index}`
  }))
}

export const checkPort = (
  port: number,
  host = '127.0.0.1',
  timeoutMs = 2000
): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = createConnection(port, host)
    const timer = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, timeoutMs)
    socket.once('connect', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })

export type DetectedBrowser = KnownBrowser & {
  remoteDebuggingPort: number
  wsPath: string | null
}

export const readDevToolsActivePort = async (filePath: string): Promise<{ port: number; wsPath: string | null } | null> => {
  try {
    const content = await readFile(filePath, 'utf8')
    const lines = content.trim().split(/\r?\n/).filter(Boolean)
    const port = parseInt(lines[0] ?? '', 10)
    if (!(port > 0 && port < 65536)) return null
    return { port, wsPath: lines[1] ?? null }
  } catch {
    return null
  }
}

export const detectRunningBrowsers = async (
  // eslint-disable-next-line no-unused-vars
  fileExists: (path: string) => Promise<boolean> = (p) => access(p).then(() => true).catch(() => false)
): Promise<DetectedBrowser[]> => {
  const results: DetectedBrowser[] = []
  for (const browser of knownBrowsers()) {
    if (!(await fileExists(browser.devToolsActivePortPath))) continue
    const parsed = await readDevToolsActivePort(browser.devToolsActivePortPath)
    if (!parsed) continue
    if (!(await checkPort(parsed.port))) continue
    results.push({
      ...browser,
      remoteDebuggingPort: parsed.port,
      wsPath: parsed.wsPath
    })
  }
  return results
}

export const findFallbackCdpPort = async (): Promise<number | null> => {
  for (const port of [9222, 9229, 9333]) {
    if (await checkPort(port)) return port
  }
  return null
}