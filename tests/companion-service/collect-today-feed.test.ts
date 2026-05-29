import type { FeedItem, PlatformStatus } from '@ai-hot/shared'
import { describe, expect, test, vi } from 'vitest'

import { collectTodayFeed } from '../../apps/companion-service/src/feed/collectTodayFeed'
import { CookieAuthError } from '../../apps/companion-service/src/feed/cookieAuthFetcher'

const NOW = '2026-05-23T12:00:00.000Z'

const createFeedItem = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  id: 'github:1',
  platform: 'github',
  title: 'Repo',
  summary: '摘要',
  url: 'https://example.com/1',
  author: 'alice',
  publishedAt: '2026-05-21T00:00:00.000Z',
  popularityScore: 10,
  growthScore: 5,
  rawTags: ['ai'],
  sourceId: '1',
  ...overrides
})

const createPlatformStatus = (overrides: Partial<PlatformStatus> = {}): PlatformStatus => ({
  platform: 'github',
  state: 'ready',
  detail: null,
  lastUpdatedAt: NOW,
  lastCollectedAt: NOW,
  ...overrides
})

describe('collectTodayFeed', () => {
  test('passes the Chrome remote debugging URL into browser session creation', async () => {
    // Arrange
    const session = {
      close: vi.fn().mockResolvedValue(undefined)
    }
    const createBrowserSession = vi.fn().mockResolvedValue(session)

    // Act
    await collectTodayFeed({
      githubAdapter: vi.fn().mockResolvedValue([]),
      huggingFaceAdapter: vi.fn().mockResolvedValue([]),
      resolveChromeProfile: vi.fn().mockResolvedValue({
        isAvailable: true,
        browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: '/Users/test/Library/Application Support/Google/Chrome',
        profileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Profile 1',
        automationUserDataDir:
          '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
        reason: null
      }),
      createBrowserSession,
      detectPlatformLoginState: vi
        .fn()
        .mockResolvedValue(createPlatformStatus({ platform: 'x', state: 'not_logged_in', lastCollectedAt: null }))
        .mockResolvedValue(createPlatformStatus({ platform: 'youtube', state: 'not_logged_in', lastCollectedAt: null })),
      chromeRemoteDebuggingUrl: 'http://127.0.0.1:9222',
      now: () => NOW
    })

    // Assert
    expect(createBrowserSession).toHaveBeenCalledWith({
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir:
        '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Profile 1',
      remoteDebuggingUrl: 'http://127.0.0.1:9222'
    })
    expect(session.close).toHaveBeenCalledTimes(1)
  })

  test('collects browser-backed platforms and returns platform statuses', async () => {
    // Arrange
    const session = {
      close: vi.fn().mockResolvedValue(undefined)
    }
    const githubAdapter = vi.fn().mockResolvedValue([createFeedItem()])
    const huggingFaceAdapter = vi.fn().mockResolvedValue([
      createFeedItem({
        id: 'huggingface:1',
        platform: 'huggingface',
        title: 'Model',
        url: 'https://example.com/2',
        author: 'bob',
        popularityScore: 8,
        growthScore: 4,
        sourceId: '2'
      })
    ])
    const resolveChromeProfile = vi.fn().mockResolvedValue({
      isAvailable: true,
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      profileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      automationUserDataDir:
        '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      reason: null
    })
    const createBrowserSession = vi.fn().mockResolvedValue(session)
    const detectPlatformLoginState = vi
      .fn()
      .mockResolvedValueOnce(createPlatformStatus({ platform: 'x' }))
      .mockResolvedValueOnce(createPlatformStatus({ platform: 'youtube' }))
    const xAdapter = vi.fn().mockResolvedValue([
      createFeedItem({
        id: 'x:1',
        platform: 'x',
        title: 'X item',
        url: 'https://x.com/test/status/1',
        sourceId: 'x-1'
      })
    ])
    const youtubeAdapter = vi.fn().mockResolvedValue([
      createFeedItem({
        id: 'youtube:1',
        platform: 'youtube',
        title: 'YouTube item',
        url: 'https://www.youtube.com/watch?v=yt-1',
        sourceId: 'yt-1'
      })
    ])
    
    // Act
    const result = await collectTodayFeed({
      githubAdapter,
      huggingFaceAdapter,
      resolveChromeProfile,
      createBrowserSession,
      detectPlatformLoginState,
      xAdapter,
      youtubeAdapter,
      searchQuery: 'agent',
            now: () => NOW
    })

    // Assert
    expect(githubAdapter).toHaveBeenCalledWith('agent')
    expect(huggingFaceAdapter).toHaveBeenCalledWith('agent')
    expect(result).toEqual({
      platformBuckets: {
        github: [createFeedItem()],
        x: [
          createFeedItem({
            id: 'x:1',
            platform: 'x',
            title: 'X item',
            url: 'https://x.com/test/status/1',
            sourceId: 'x-1'
          })
        ],
        youtube: [
          createFeedItem({
            id: 'youtube:1',
            platform: 'youtube',
            title: 'YouTube item',
            url: 'https://www.youtube.com/watch?v=yt-1',
            sourceId: 'yt-1'
          })
        ],
        huggingface: [
          createFeedItem({
            id: 'huggingface:1',
            platform: 'huggingface',
            title: 'Model',
            url: 'https://example.com/2',
            author: 'bob',
            popularityScore: 8,
            growthScore: 4,
            sourceId: '2'
          })
        ]
      },
      platformStatuses: [
        createPlatformStatus({ platform: 'github' }),
        createPlatformStatus({ platform: 'x' }),
        createPlatformStatus({ platform: 'youtube' }),
        
        createPlatformStatus({ platform: 'huggingface' })
      ]
    })
    expect(createBrowserSession).toHaveBeenCalledWith({
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      sourceUserDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      sourceProfileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      remoteDebuggingUrl: null
    })
    expect(detectPlatformLoginState).toHaveBeenCalledTimes(2)
    expect(xAdapter).toHaveBeenCalledWith(session, 'agent')
    expect(youtubeAdapter).toHaveBeenCalledWith(session, 'agent')
    expect(session.close).toHaveBeenCalledTimes(1)
  })

  test('marks a browser-backed platform as parse_failed when its adapter throws', async () => {
    // Arrange
    const session = {
      close: vi.fn().mockResolvedValue(undefined)
    }
    const githubAdapter = vi.fn().mockResolvedValue([createFeedItem()])
    const huggingFaceAdapter = vi.fn().mockResolvedValue([])
    const resolveChromeProfile = vi.fn().mockResolvedValue({
      isAvailable: true,
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      profileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      automationUserDataDir:
        '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
      reason: null
    })
    const createBrowserSession = vi.fn().mockResolvedValue(session)
    const detectPlatformLoginState = vi
      .fn()
      .mockResolvedValueOnce(createPlatformStatus({ platform: 'x' }))
      .mockResolvedValueOnce(createPlatformStatus({ platform: 'youtube' }))
    const xAdapter = vi.fn().mockResolvedValue([
      createFeedItem({
        id: 'x:1',
        platform: 'x',
        title: 'X item',
        url: 'https://x.com/test/status/1',
        sourceId: 'x-1'
      })
    ])
    const youtubeAdapter = vi.fn().mockResolvedValue([
      createFeedItem({
        id: 'youtube:1',
        platform: 'youtube',
        title: 'YouTube item',
        url: 'https://www.youtube.com/watch?v=yt-1',
        sourceId: 'yt-1'
      })
    ])
    
    // Act
    const result = await collectTodayFeed({
      githubAdapter,
      huggingFaceAdapter,
      resolveChromeProfile,
      createBrowserSession,
      detectPlatformLoginState,
      xAdapter,
      youtubeAdapter,
            now: () => NOW
    })

    // Assert
    expect(result.platformBuckets).toEqual({
      github: [createFeedItem()],
      x: [
        createFeedItem({
          id: 'x:1',
          platform: 'x',
          title: 'X item',
          url: 'https://x.com/test/status/1',
          sourceId: 'x-1'
        })
      ],
      youtube: [
        createFeedItem({
          id: 'youtube:1',
          platform: 'youtube',
          title: 'YouTube item',
          url: 'https://www.youtube.com/watch?v=yt-1',
          sourceId: 'yt-1'
        })
      ],
      huggingface: []
    })
    expect(result.platformStatuses).toEqual([
      createPlatformStatus({ platform: 'github' }),
      createPlatformStatus({ platform: 'x' }),
      createPlatformStatus({ platform: 'youtube' }),
      
      createPlatformStatus({
        platform: 'huggingface',
        state: 'no_results',
        lastCollectedAt: null
      })
    ])
    expect(session.close).toHaveBeenCalledTimes(1)
  })

  test('marks browser-backed platforms unavailable when the default Chrome profile is missing', async () => {
    // Arrange
    const githubAdapter = vi.fn().mockResolvedValue([createFeedItem()])
    const huggingFaceAdapter = vi.fn().mockResolvedValue([])
    const resolveChromeProfile = vi.fn().mockResolvedValue({
      isAvailable: false,
      browserExecutablePath: null,
      userDataDir: null,
      profileDirectory: null,
      reason: 'browser_unavailable'
    })
    const createBrowserSession = vi.fn()
    const detectPlatformLoginState = vi.fn()
    const xAdapter = vi.fn()
    const youtubeAdapter = vi.fn()
    
    // Act
    const result = await collectTodayFeed({
      githubAdapter,
      huggingFaceAdapter,
      resolveChromeProfile,
      createBrowserSession,
      detectPlatformLoginState,
      xAdapter,
      youtubeAdapter,
            now: () => NOW
    })

    // Assert
    expect(result.platformBuckets).toEqual({
      github: [createFeedItem()],
      x: [],
      youtube: [],
      huggingface: []
    })
    expect(result.platformStatuses).toEqual([
      createPlatformStatus({ platform: 'github' }),
      createPlatformStatus({
        platform: 'x',
        state: 'browser_unavailable',
        detail: '本机 Chrome 不可用',
        lastCollectedAt: null
      }),
      createPlatformStatus({
        platform: 'youtube',
        state: 'browser_unavailable',
        detail: '本机 Chrome 不可用',
        lastCollectedAt: null
      }),
      
      createPlatformStatus({
        platform: 'huggingface',
        state: 'no_results',
        lastCollectedAt: null
      })
    ])
    expect(createBrowserSession).not.toHaveBeenCalled()
    expect(detectPlatformLoginState).not.toHaveBeenCalled()
    expect(xAdapter).not.toHaveBeenCalled()
    expect(youtubeAdapter).not.toHaveBeenCalled()
  })
})

describe('collectTodayFeed with cookie extraction', () => {
  test('extracts and saves cookies after creating the browser session', async () => {
    const session = {
      getCookies: vi.fn().mockResolvedValue('session=abc'),
      close: vi.fn().mockResolvedValue(undefined)
    }
    const cookiesRepo = {
      get: vi.fn().mockReturnValue(null),
      save: vi.fn()
    }
    const createBrowserSession = vi.fn().mockResolvedValue(session)

    await collectTodayFeed({
      githubAdapter: vi.fn().mockResolvedValue([]),
      huggingFaceAdapter: vi.fn().mockResolvedValue([]),
      resolveChromeProfile: vi.fn().mockResolvedValue({
        isAvailable: true,
        browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: '/Users/test/Library/Application Support/Google/Chrome',
        profileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
        automationUserDataDir:
          '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
        reason: null
      }),
      createBrowserSession,
      detectPlatformLoginState: vi.fn().mockResolvedValue(
        createPlatformStatus({ platform: 'x', state: 'not_logged_in', lastCollectedAt: null })
      ),
      xApiAdapter: vi.fn(),
      youtubeApiAdapter: vi.fn(),
      cookiesRepository: cookiesRepo as never,
      now: () => NOW
    })

    expect(session.getCookies).toHaveBeenCalledWith('x')
    expect(session.getCookies).toHaveBeenCalledWith('youtube')
    expect(cookiesRepo.save).toHaveBeenCalledWith('x', 'session=abc')
    expect(cookiesRepo.save).toHaveBeenCalledWith('youtube', 'session=abc')
    expect(session.close).toHaveBeenCalledTimes(1)
  })

  test('prefers API adapter over HTML adapter when both are provided', async () => {
    const session = {
      getCookies: vi.fn().mockResolvedValue('cookie=valid'),
      close: vi.fn().mockResolvedValue(undefined)
    }
    const cookiesRepo = {
      get: vi.fn().mockReturnValue('cookie=valid'),
      save: vi.fn()
    }

    const apiItems = [
      createFeedItem({ id: 'x:1', platform: 'x', title: 'From API', url: 'https://x.com/a/status/1', sourceId: '1' })
    ]
    const xApiAdapter = vi.fn().mockResolvedValue(apiItems)
    const xHtmlAdapter = vi.fn()

    await collectTodayFeed({
      githubAdapter: vi.fn().mockResolvedValue([]),
      huggingFaceAdapter: vi.fn().mockResolvedValue([]),
      resolveChromeProfile: vi.fn().mockResolvedValue({
        isAvailable: true,
        browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: '/Users/test/Library/Application Support/Google/Chrome',
        profileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
        automationUserDataDir:
          '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
        reason: null
      }),
      createBrowserSession: vi.fn().mockResolvedValue(session),
      detectPlatformLoginState: vi.fn().mockResolvedValue(
        createPlatformStatus({ platform: 'x' })
      ),
      xAdapter: xHtmlAdapter,
      xCdpAdapter: undefined,
      xApiAdapter,
      youtubeApiAdapter: vi.fn().mockResolvedValue([]),
      youtubeAdapter: vi.fn().mockResolvedValue([]),

      cookiesRepository: cookiesRepo as never,
      now: () => NOW
    })

    expect(xApiAdapter).toHaveBeenCalledTimes(1)
    expect(xHtmlAdapter).not.toHaveBeenCalled()
  })

  test('falls back to HTML adapter when API adapter throws CookieAuthError', async () => {
    const session = {
      getCookies: vi.fn().mockResolvedValue('cookie=bad'),
      close: vi.fn().mockResolvedValue(undefined)
    }
    const cookiesRepo = {
      get: vi.fn().mockReturnValue('cookie=bad'),
      save: vi.fn()
    }

    const xApiAdapter = vi.fn().mockRejectedValue(new CookieAuthError('x', 401))
    const htmlItems = [
      createFeedItem({ id: 'x:2', platform: 'x', title: 'From HTML', url: 'https://x.com/b/status/2', sourceId: '2' })
    ]
    const xHtmlAdapter = vi.fn().mockResolvedValue(htmlItems)

    const result = await collectTodayFeed({
      githubAdapter: vi.fn().mockResolvedValue([]),
      huggingFaceAdapter: vi.fn().mockResolvedValue([]),
      resolveChromeProfile: vi.fn().mockResolvedValue({
        isAvailable: true,
        browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: '/Users/test/Library/Application Support/Google/Chrome',
        profileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
        automationUserDataDir:
          '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
        reason: null
      }),
      createBrowserSession: vi.fn().mockResolvedValue(session),
      detectPlatformLoginState: vi.fn().mockResolvedValue(
        createPlatformStatus({ platform: 'x' })
      ),
      xAdapter: xHtmlAdapter,
      xCdpAdapter: undefined,
      xApiAdapter,
      youtubeApiAdapter: vi.fn().mockResolvedValue([]),
      youtubeAdapter: vi.fn().mockResolvedValue([]),

      cookiesRepository: cookiesRepo as never,
      now: () => NOW
    })

    expect(xApiAdapter).toHaveBeenCalledTimes(1)
    expect(xHtmlAdapter).toHaveBeenCalledTimes(1)
    expect(result.platformBuckets.x[0].title).toBe('From HTML')
  })

  test('returns not_logged_in instead of parse_failed when stored cookies exist, browser is not logged in, and API auth refresh still fails', async () => {
    const session = {
      getCookies: vi.fn().mockResolvedValue('cookie=stale'),
      close: vi.fn().mockResolvedValue(undefined)
    }
    const cookiesRepo = {
      get: vi.fn().mockReturnValue('cookie=stale'),
      save: vi.fn()
    }

    const xApiAdapter = vi.fn().mockRejectedValue(new CookieAuthError('x', 401))
    const xHtmlAdapter = vi.fn().mockRejectedValue(new CookieAuthError('x', 401))

    const result = await collectTodayFeed({
      githubAdapter: vi.fn().mockResolvedValue([]),
      huggingFaceAdapter: vi.fn().mockResolvedValue([]),
      resolveChromeProfile: vi.fn().mockResolvedValue({
        isAvailable: true,
        browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: '/Users/test/Library/Application Support/Google/Chrome',
        profileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
        automationUserDataDir:
          '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
        reason: null
      }),
      createBrowserSession: vi.fn().mockResolvedValue(session),
      detectPlatformLoginState: vi.fn().mockResolvedValue(
        createPlatformStatus({
          platform: 'x',
          state: 'not_logged_in',
          detail: '当前浏览器未登录该平台',
          lastCollectedAt: null
        })
      ),
      xAdapter: xHtmlAdapter,
      xCdpAdapter: undefined,
      xApiAdapter,
      youtubeApiAdapter: vi.fn().mockResolvedValue([]),
      youtubeAdapter: vi.fn().mockResolvedValue([]),

      cookiesRepository: cookiesRepo as never,
      now: () => NOW
    })

    expect(result.platformBuckets.x).toEqual([])
    expect(result.platformStatuses[1]).toEqual(
      createPlatformStatus({
        platform: 'x',
        state: 'not_logged_in',
        detail: '当前浏览器未登录该平台',
        lastCollectedAt: null
      })
    )
  })

  test('falls back to HTML adapter when API adapter returns an empty array', async () => {
    const session = {
      getCookies: vi.fn().mockResolvedValue('cookie=valid'),
      close: vi.fn().mockResolvedValue(undefined)
    }
    const cookiesRepo = {
      get: vi.fn().mockReturnValue('cookie=valid'),
      save: vi.fn()
    }

    const xApiAdapter = vi.fn().mockResolvedValue([])
    const htmlItems = [
      createFeedItem({ id: 'x:3', platform: 'x', title: 'From HTML fallback', url: 'https://x.com/c/status/3', sourceId: '3' })
    ]
    const xHtmlAdapter = vi.fn().mockResolvedValue(htmlItems)

    const result = await collectTodayFeed({
      githubAdapter: vi.fn().mockResolvedValue([]),
      huggingFaceAdapter: vi.fn().mockResolvedValue([]),
      resolveChromeProfile: vi.fn().mockResolvedValue({
        isAvailable: true,
        browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: '/Users/test/Library/Application Support/Google/Chrome',
        profileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
        automationUserDataDir:
          '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
        reason: null
      }),
      createBrowserSession: vi.fn().mockResolvedValue(session),
      detectPlatformLoginState: vi.fn().mockResolvedValue(
        createPlatformStatus({ platform: 'x' })
      ),
      xAdapter: xHtmlAdapter,
      xCdpAdapter: undefined,
      xApiAdapter,
      youtubeApiAdapter: vi.fn().mockResolvedValue([]),
      youtubeAdapter: vi.fn().mockResolvedValue([]),

      cookiesRepository: cookiesRepo as never,
      now: () => NOW
    })

    expect(xApiAdapter).toHaveBeenCalledTimes(1)
    expect(xHtmlAdapter).toHaveBeenCalledTimes(1)
    expect(result.platformBuckets.x[0].title).toBe('From HTML fallback')
    expect(result.platformStatuses[1]).toEqual(createPlatformStatus({ platform: 'x' }))
  })

  test('returns parse_failed when the API adapter throws a non-auth error', async () => {
    const session = {
      getCookies: vi.fn().mockResolvedValue('cookie=valid'),
      close: vi.fn().mockResolvedValue(undefined)
    }
    const cookiesRepo = {
      get: vi.fn().mockReturnValue('cookie=valid'),
      save: vi.fn()
    }

    const xApiAdapter = vi.fn().mockRejectedValue(new Error('upstream 500'))
    const xHtmlAdapter = vi.fn()

    const result = await collectTodayFeed({
      githubAdapter: vi.fn().mockResolvedValue([]),
      huggingFaceAdapter: vi.fn().mockResolvedValue([]),
      resolveChromeProfile: vi.fn().mockResolvedValue({
        isAvailable: true,
        browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: '/Users/test/Library/Application Support/Google/Chrome',
        profileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
        automationUserDataDir:
          '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
        reason: null
      }),
      createBrowserSession: vi.fn().mockResolvedValue(session),
      detectPlatformLoginState: vi.fn().mockResolvedValue(
        createPlatformStatus({ platform: 'x' })
      ),
      xAdapter: xHtmlAdapter,
      xCdpAdapter: undefined,
      xApiAdapter,
      youtubeApiAdapter: vi.fn().mockResolvedValue([]),
      youtubeAdapter: vi.fn().mockResolvedValue([]),

      cookiesRepository: cookiesRepo as never,
      now: () => NOW
    })

    expect(xApiAdapter).toHaveBeenCalledTimes(1)
    expect(xHtmlAdapter).not.toHaveBeenCalled()
    expect(result.platformStatuses[1]).toEqual(
      createPlatformStatus({
        platform: 'x',
        state: 'parse_failed',
        detail: 'upstream 500',
        lastCollectedAt: null
      })
    )
  })

  test('still uses HTML adapter when cookiesRepository is not provided', async () => {
    const session = {
      close: vi.fn().mockResolvedValue(undefined)
    }
    const xHtmlAdapter = vi.fn().mockResolvedValue([
      createFeedItem({ id: 'x:1', platform: 'x', title: 'HTML only', url: 'https://x.com/test/status/1', sourceId: '1' })
    ])

    const result = await collectTodayFeed({
      githubAdapter: vi.fn().mockResolvedValue([]),
      huggingFaceAdapter: vi.fn().mockResolvedValue([]),
      resolveChromeProfile: vi.fn().mockResolvedValue({
        isAvailable: true,
        browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: '/Users/test/Library/Application Support/Google/Chrome',
        profileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
        automationUserDataDir:
          '/Users/test/Library/Application Support/ai-hot/companion-service/browser/chrome-automation',
        reason: null
      }),
      createBrowserSession: vi.fn().mockResolvedValue(session),
      detectPlatformLoginState: vi.fn().mockResolvedValue(
        createPlatformStatus({ platform: 'x' })
      ),
      xAdapter: xHtmlAdapter,
      now: () => NOW
    })

    expect(result.platformBuckets.x[0].title).toBe('HTML only')
    expect(xHtmlAdapter).toHaveBeenCalledTimes(1)
  })
})
