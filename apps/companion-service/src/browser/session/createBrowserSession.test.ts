import { chromium } from 'playwright-core'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createBrowserSession } from './createBrowserSession'

const makeContextMocks = () => {
  const cdpSession = {
    send: vi.fn().mockResolvedValue({ cookies: [] }),
    detach: vi.fn().mockResolvedValue(undefined)
  }
  const page = {
    goto: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }
  const context = {
    newPage: vi.fn().mockResolvedValue(page),
    newCDPSession: vi.fn().mockResolvedValue(cdpSession),
    close: vi.fn().mockResolvedValue(undefined)
  }
  return { cdpSession, page, context }
}

describe('createBrowserSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('prefers connecting to an existing Chrome remote debugging session when a CDP URL is provided', async () => {
    const { page, context } = makeContextMocks()
    const browser = {
      contexts: vi.fn().mockReturnValue([context]),
      close: vi.fn().mockResolvedValue(undefined)
    }
    const connectOverCDP = vi.spyOn(chromium, 'connectOverCDP').mockResolvedValue(browser as never)
    const launchPersistentContext = vi.spyOn(chromium, 'launchPersistentContext')
    const prepareUserDataDir = vi.fn()
    const createSessionUserDataDir = vi.fn()
    const removeSessionUserDataDir = vi.fn()

    const session = await createBrowserSession({
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      remoteDebuggingUrl: 'http://127.0.0.1:9222',
      prepareUserDataDir,
      createSessionUserDataDir,
      removeSessionUserDataDir
    })
    const openedPage = await session.openPage('https://example.com/feed')
    await session.close()

    expect(connectOverCDP).toHaveBeenCalledWith('http://127.0.0.1:9222', { noDefaults: true })
    expect(launchPersistentContext).not.toHaveBeenCalled()
    expect(createSessionUserDataDir).not.toHaveBeenCalled()
    expect(prepareUserDataDir).not.toHaveBeenCalled()
    expect(removeSessionUserDataDir).not.toHaveBeenCalled()
    expect(context.newPage).toHaveBeenCalledTimes(2) // utility page + opened page
    expect(page.goto).toHaveBeenCalledWith('https://example.com/feed', { waitUntil: 'domcontentloaded' })
    expect(openedPage).toBe(page)
    expect(browser.close).toHaveBeenCalledTimes(1)
  })

  test('falls back to a temporary automation profile when the CDP connection fails', async () => {
    const prepareUserDataDir = vi.fn().mockResolvedValue(undefined)
    const createSessionUserDataDir = vi
      .fn()
      .mockResolvedValue(
        '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation/session-cdp-fallback'
      )
    const removeSessionUserDataDir = vi.fn().mockResolvedValue(undefined)

    const { context } = makeContextMocks()

    const connectOverCDP = vi
      .spyOn(chromium, 'connectOverCDP')
      .mockRejectedValue(new Error('connect failed'))
    const launchPersistentContext = vi
      .spyOn(chromium, 'launchPersistentContext')
      .mockResolvedValue(context as never)

    const session = await createBrowserSession({
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      remoteDebuggingUrl: 'http://127.0.0.1:9222',
      prepareUserDataDir,
      createSessionUserDataDir,
      removeSessionUserDataDir
    })
    await session.close()

    expect(connectOverCDP).toHaveBeenCalledWith('http://127.0.0.1:9222', { noDefaults: true })
    expect(createSessionUserDataDir).toHaveBeenCalledWith(
      '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation'
    )
    expect(prepareUserDataDir).toHaveBeenCalledWith({
      targetUserDataDir:
        '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation/session-cdp-fallback',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default'
    })
    expect(launchPersistentContext).toHaveBeenCalledWith(
      '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation/session-cdp-fallback',
      {
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true
      }
    )
    expect(context.close).toHaveBeenCalledTimes(1)
    expect(removeSessionUserDataDir).toHaveBeenCalledWith(
      '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation/session-cdp-fallback'
    )
  })

  test('throws when the connected Chrome exposes multiple browser contexts', async () => {
    const contextA = { newPage: vi.fn() }
    const contextB = { newPage: vi.fn() }
    const browser = {
      contexts: vi.fn().mockReturnValue([contextA, contextB]),
      close: vi.fn().mockResolvedValue(undefined)
    }

    vi.spyOn(chromium, 'connectOverCDP').mockResolvedValue(browser as never)
    const launchPersistentContext = vi.spyOn(chromium, 'launchPersistentContext')

    await expect(
      createBrowserSession({
        browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
        sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
        sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
        remoteDebuggingUrl: 'http://127.0.0.1:9222'
      })
    ).rejects.toThrow('Connected Chrome exposes multiple browser contexts')
    expect(browser.close).toHaveBeenCalledTimes(1)
    expect(launchPersistentContext).not.toHaveBeenCalled()
  })

  test('bootstraps a temporary automation profile before launching the browser', async () => {
    const prepareUserDataDir = vi.fn().mockResolvedValue(undefined)
    const createSessionUserDataDir = vi
      .fn()
      .mockResolvedValue(
        '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation/session-1'
      )

    const { context } = makeContextMocks()

    const launchPersistentContext = vi
      .spyOn(chromium, 'launchPersistentContext')
      .mockResolvedValue(context as never)

    await createBrowserSession({
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      prepareUserDataDir,
      createSessionUserDataDir
    })

    expect(createSessionUserDataDir).toHaveBeenCalledWith(
      '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation'
    )
    expect(prepareUserDataDir).toHaveBeenCalledWith({
      targetUserDataDir:
        '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation/session-1',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default'
    })
    expect(launchPersistentContext).toHaveBeenCalledWith(
      '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation/session-1',
      {
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true
      }
    )
  })

  test('removes the temporary automation profile when the session closes', async () => {
    const removeSessionUserDataDir = vi.fn().mockResolvedValue(undefined)

    const { context } = makeContextMocks()
    vi.spyOn(chromium, 'launchPersistentContext').mockResolvedValue(context as never)

    const session = await createBrowserSession({
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      prepareUserDataDir: vi.fn().mockResolvedValue(undefined),
      createSessionUserDataDir: vi
        .fn()
        .mockResolvedValue(
          '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation/session-2'
        ),
      removeSessionUserDataDir
    })

    await session.close()

    expect(context.close).toHaveBeenCalledTimes(1)
    expect(removeSessionUserDataDir).toHaveBeenCalledWith(
      '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation/session-2'
    )
  })

  test('removes the temporary automation profile when browser launch fails', async () => {
    const removeSessionUserDataDir = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(chromium, 'launchPersistentContext').mockRejectedValue(new Error('launch failed'))

    await expect(
      createBrowserSession({
        browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir:
          '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
        sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
        sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
        prepareUserDataDir: vi.fn().mockResolvedValue(undefined),
        createSessionUserDataDir: vi
          .fn()
          .mockResolvedValue(
            '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation/session-4'
          ),
        removeSessionUserDataDir
      })
    ).rejects.toThrow('launch failed')
    expect(removeSessionUserDataDir).toHaveBeenCalledWith(
      '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation/session-4'
    )
  })
})

describe('BrowserSession.isLoggedIn', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('detects X login by checking for auth_token cookie', async () => {
    const cdpSession = { send: vi.fn(), detach: vi.fn().mockResolvedValue(undefined) }
    const page = { goto: vi.fn(), close: vi.fn().mockResolvedValue(undefined) }
    const context = {
      newPage: vi.fn().mockResolvedValue(page),
      newCDPSession: vi.fn().mockResolvedValue(cdpSession),
      close: vi.fn().mockResolvedValue(undefined)
    }

    vi.spyOn(chromium, 'launchPersistentContext').mockResolvedValue(context as never)

    const session = await createBrowserSession({
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      prepareUserDataDir: vi.fn().mockResolvedValue(undefined),
      createSessionUserDataDir: vi.fn().mockResolvedValue('/tmp/session'),
      removeSessionUserDataDir: vi.fn().mockResolvedValue(undefined)
    })

    // User has auth_token
    cdpSession.send.mockResolvedValueOnce({ cookies: [{ name: 'auth_token', value: 'token123' }] })
    const loggedIn = await session.isLoggedIn('x')
    expect(loggedIn).toBe(true)

    // User does not have auth_token
    cdpSession.send.mockResolvedValueOnce({ cookies: [{ name: 'guest_id', value: 'guest' }] })
    const loggedOut = await session.isLoggedIn('x')
    expect(loggedOut).toBe(false)

    expect(cdpSession.send).toHaveBeenCalledWith('Network.getCookies', {
      urls: ['https://x.com', 'https://.x.com']
    })
    // No page navigation
    expect(page.goto).not.toHaveBeenCalled()

    await session.close()
  })

  test('youtube always returns true without cookie check', async () => {
    const cdpSession = { send: vi.fn(), detach: vi.fn().mockResolvedValue(undefined) }
    const page = { goto: vi.fn(), close: vi.fn().mockResolvedValue(undefined) }
    const context = {
      newPage: vi.fn().mockResolvedValue(page),
      newCDPSession: vi.fn().mockResolvedValue(cdpSession),
      close: vi.fn().mockResolvedValue(undefined)
    }

    vi.spyOn(chromium, 'launchPersistentContext').mockResolvedValue(context as never)

    const session = await createBrowserSession({
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      prepareUserDataDir: vi.fn().mockResolvedValue(undefined),
      createSessionUserDataDir: vi.fn().mockResolvedValue('/tmp/session'),
      removeSessionUserDataDir: vi.fn().mockResolvedValue(undefined)
    })

    const result = await session.isLoggedIn('youtube')
    expect(result).toBe(true)
    // No cookie check or page navigation for youtube
    expect(cdpSession.send).not.toHaveBeenCalled()
    expect(page.goto).not.toHaveBeenCalled()

    await session.close()
  })
})

describe('BrowserSession.getCookies', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('extracts cookies via CDP without page navigation', async () => {
    const cdpSession = {
      send: vi.fn().mockResolvedValue({
        cookies: [
          { name: 'auth_token', value: 'abc123' },
          { name: 'ct0', value: 'xyz789' },
          { name: 'twid', value: 'u=123' },
          { name: 'guest_id', value: 'guest' }
        ]
      }),
      detach: vi.fn().mockResolvedValue(undefined)
    }
    const page = { goto: vi.fn(), close: vi.fn().mockResolvedValue(undefined) }
    const context = {
      newPage: vi.fn().mockResolvedValue(page),
      newCDPSession: vi.fn().mockResolvedValue(cdpSession),
      close: vi.fn().mockResolvedValue(undefined)
    }

    vi.spyOn(chromium, 'launchPersistentContext').mockResolvedValue(context as never)

    const session = await createBrowserSession({
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      prepareUserDataDir: vi.fn().mockResolvedValue(undefined),
      createSessionUserDataDir: vi.fn().mockResolvedValue('/tmp/session'),
      removeSessionUserDataDir: vi.fn().mockResolvedValue(undefined)
    })

    const cookieString = await session.getCookies('x')

    // X only returns auth-related cookies
    expect(cookieString).toBe('auth_token=abc123; ct0=xyz789; twid=u=123')
    expect(cdpSession.send).toHaveBeenCalledWith('Network.getCookies', {
      urls: ['https://x.com', 'https://.x.com']
    })
    // No page navigation
    expect(page.goto).not.toHaveBeenCalled()

    await session.close()
  })

  test('youtube returns all cookies', async () => {
    const cdpSession = {
      send: vi.fn().mockResolvedValue({
        cookies: [
          { name: 'LOGIN_INFO', value: 'li123' },
          { name: 'PREF', value: 'pref456' }
        ]
      }),
      detach: vi.fn().mockResolvedValue(undefined)
    }
    const page = { goto: vi.fn(), close: vi.fn().mockResolvedValue(undefined) }
    const context = {
      newPage: vi.fn().mockResolvedValue(page),
      newCDPSession: vi.fn().mockResolvedValue(cdpSession),
      close: vi.fn().mockResolvedValue(undefined)
    }

    vi.spyOn(chromium, 'launchPersistentContext').mockResolvedValue(context as never)

    const session = await createBrowserSession({
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      prepareUserDataDir: vi.fn().mockResolvedValue(undefined),
      createSessionUserDataDir: vi.fn().mockResolvedValue('/tmp/session'),
      removeSessionUserDataDir: vi.fn().mockResolvedValue(undefined)
    })

    const cookieString = await session.getCookies('youtube')

    expect(cookieString).toBe('LOGIN_INFO=li123; PREF=pref456')
    expect(cdpSession.send).toHaveBeenCalledWith('Network.getCookies', {
      urls: ['https://www.youtube.com', 'https://.youtube.com']
    })

    await session.close()
  })

  test('returns empty string when no cookies are found', async () => {
    const cdpSession = {
      send: vi.fn().mockResolvedValue({ cookies: [] }),
      detach: vi.fn().mockResolvedValue(undefined)
    }
    const page = { goto: vi.fn(), close: vi.fn().mockResolvedValue(undefined) }
    const context = {
      newPage: vi.fn().mockResolvedValue(page),
      newCDPSession: vi.fn().mockResolvedValue(cdpSession),
      close: vi.fn().mockResolvedValue(undefined)
    }

    vi.spyOn(chromium, 'launchPersistentContext').mockResolvedValue(context as never)

    const session = await createBrowserSession({
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      prepareUserDataDir: vi.fn().mockResolvedValue(undefined),
      createSessionUserDataDir: vi.fn().mockResolvedValue('/tmp/session'),
      removeSessionUserDataDir: vi.fn().mockResolvedValue(undefined)
    })

    const cookieString = await session.getCookies('x')

    expect(cookieString).toBe('')
    await session.close()
  })
})