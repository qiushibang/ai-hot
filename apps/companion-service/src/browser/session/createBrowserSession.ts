import { cp, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core'

export type BrowserSession = {
  // eslint-disable-next-line no-unused-vars
  openPage: (url: string) => Promise<Page>
  newPage: () => Promise<Page>
  // eslint-disable-next-line no-unused-vars
  isLoggedIn: (platform: 'x' | 'youtube') => Promise<boolean>
  // eslint-disable-next-line no-unused-vars
  getCookies: (platform: 'x' | 'youtube') => Promise<string>
  close: () => Promise<void>
}

type CreateBrowserSessionDependencies = {
  browserExecutablePath: string
  userDataDir: string
  sourceUserDataDir: string
  sourceProfileDirectory: string
  remoteDebuggingUrl?: string | null
  prepareUserDataDir?: typeof prepareUserDataDir
  createSessionUserDataDir?: typeof createSessionUserDataDir
  removeSessionUserDataDir?: typeof removeSessionUserDataDir
}

const PLATFORM_COOKIE_DOMAINS: Record<'x' | 'youtube', string[]> = {
  x: ['https://x.com', 'https://.x.com'],
  youtube: ['https://www.youtube.com', 'https://.youtube.com']
}

const X_AUTH_COOKIE_NAMES = new Set(['auth_token', 'ct0', 'twid'])

const hasAuthCookies = (cookies: Array<{ name: string }>): boolean =>
  cookies.some((c) => c.name === 'auth_token')

const serializeCookies = (cookies: Array<{ name: string; value: string }>): string =>
  cookies.map((c) => `${c.name}=${c.value}`).join('; ')

const VOLATILE_ENTRY_PATTERNS = [/^Singleton/, /^Lock/, /^DevTools/, /^Crashpad/, /^BrowserMetrics/]

const shouldSkipEntry = (name: string): boolean =>
  VOLATILE_ENTRY_PATTERNS.some((pattern) => pattern.test(name))

const createSessionUserDataDir = async (userDataDir: string): Promise<string> => {
  await mkdir(userDataDir, { recursive: true })
  return mkdtemp(join(userDataDir, 'session-'))
}

const removeSessionUserDataDir = async (userDataDir: string): Promise<void> => {
  await rm(userDataDir, { recursive: true, force: true })
}

const prepareUserDataDir = async ({
  targetUserDataDir,
  sourceUserDataDir,
  sourceProfileDirectory
}: {
  targetUserDataDir: string
  sourceUserDataDir: string
  sourceProfileDirectory: string
}): Promise<void> => {
  await rm(targetUserDataDir, { recursive: true, force: true })
  await mkdir(targetUserDataDir, { recursive: true })

  const sourceEntries = await readdir(sourceUserDataDir)

  await Promise.all(
    sourceEntries
      .filter((entry) => !shouldSkipEntry(entry))
      .map((entry) =>
        cp(join(sourceUserDataDir, entry), join(targetUserDataDir, entry), {
          recursive: true,
          force: true
        })
      )
  )

  const profileName = basename(sourceProfileDirectory)
  const profileTargetDirectory = join(targetUserDataDir, profileName)

  await rm(profileTargetDirectory, { recursive: true, force: true })
  await cp(sourceProfileDirectory, profileTargetDirectory, {
    recursive: true,
    force: true
  })
}

const createBrowserSessionFromContext = async ({
  context,
  close
}: {
  context: BrowserContext
  close: () => Promise<void>
}): Promise<BrowserSession> => {
  const utilityPage = await context.newPage()
  const cdpSession = await context.newCDPSession(utilityPage)

  const getCookiesForUrls = async (urls: string[]): Promise<Array<{ name: string; value: string }>> => {
    const { cookies } = await cdpSession.send('Network.getCookies', { urls })
    return cookies
  }

  const cleanup = async (): Promise<void> => {
    await cdpSession.detach()
    await utilityPage.close()
    await close()
  }

  return {
    newPage: () => context.newPage(),

    async openPage(url: string): Promise<Page> {
      const page = await context.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      return page
    },

    async isLoggedIn(platform: 'x' | 'youtube'): Promise<boolean> {
      if (platform === 'youtube') {
        return true
      }

      const cookies = await getCookiesForUrls(PLATFORM_COOKIE_DOMAINS[platform])
      return hasAuthCookies(cookies)
    },

    async getCookies(platform: 'x' | 'youtube'): Promise<string> {
      const cookies = await getCookiesForUrls(PLATFORM_COOKIE_DOMAINS[platform])

      if (platform === 'x') {
        return serializeCookies(cookies.filter((c) => X_AUTH_COOKIE_NAMES.has(c.name)))
      }

      return serializeCookies(cookies)
    },

    close: cleanup
  }
}

const resolveBrowserContext = (browser: Browser): BrowserContext => {
  const contexts = browser.contexts()

  if (contexts.length === 1) {
    return contexts[0]!
  }

  if (contexts.length === 0) {
    throw new Error('Connected Chrome has no browser context')
  }

  throw new Error('Connected Chrome exposes multiple browser contexts')
}

export const createBrowserSession = async ({
  browserExecutablePath,
  userDataDir,
  sourceUserDataDir,
  sourceProfileDirectory,
  remoteDebuggingUrl = null,
  prepareUserDataDir: prepareUserDataDirDependency = prepareUserDataDir,
  createSessionUserDataDir: createSessionUserDataDirDependency = createSessionUserDataDir,
  removeSessionUserDataDir: removeSessionUserDataDirDependency = removeSessionUserDataDir
}: CreateBrowserSessionDependencies): Promise<BrowserSession> => {
  if (remoteDebuggingUrl) {
    let browser: Browser | null = null

    try {
      browser = await chromium.connectOverCDP(remoteDebuggingUrl, { noDefaults: true })
      const context = resolveBrowserContext(browser)
      const connectedBrowser = browser

      return await createBrowserSessionFromContext({
        context,
        close: async (): Promise<void> => {
          await connectedBrowser.close()
        }
      })
    } catch (error) {
      await browser?.close().catch(() => undefined)

      if (error instanceof Error && error.message === 'Connected Chrome exposes multiple browser contexts') {
        throw error
      }
    }
  }

  const sessionUserDataDir = await createSessionUserDataDirDependency(userDataDir)

  try {
    await prepareUserDataDirDependency({
      targetUserDataDir: sessionUserDataDir,
      sourceUserDataDir,
      sourceProfileDirectory
    })

    const context: BrowserContext = await chromium.launchPersistentContext(sessionUserDataDir, {
      executablePath: browserExecutablePath,
      headless: true
    })

    return await createBrowserSessionFromContext({
      context,
      close: async (): Promise<void> => {
        await context.close()
        await removeSessionUserDataDirDependency(sessionUserDataDir)
      }
    })
  } catch (error) {
    await removeSessionUserDataDirDependency(sessionUserDataDir)
    throw error
  }
}