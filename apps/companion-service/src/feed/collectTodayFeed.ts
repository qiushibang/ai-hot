import type {
  FeedItem,
  Platform,
  PlatformCollectionState,
  PlatformStatus
} from '@ai-hot/shared'

import { fetchGithubFeed } from '../adapters/github/fetchGithubFeed'
import { fetchHuggingFaceFeed } from '../adapters/huggingface/fetchHuggingFaceFeed'
import { fetchXFeed } from '../adapters/x/fetchXFeed'
import { fetchXFeedViaApi } from '../adapters/x/fetchXFeedViaApi'
import { fetchXFeedViaCDP } from '../adapters/x/fetchXFeedViaCDP'
import { buildXSearchQuery } from '../adapters/x/buildXSearchQuery'
import { fetchYouTubeFeed } from '../adapters/youtube/fetchYouTubeFeed'
import { fetchYouTubeFeedViaApi } from '../adapters/youtube/fetchYouTubeFeedViaApi'
import type { ChromeProfileResolution } from '../browser/profile/resolveChromeProfile'
import { resolveChromeProfile } from '../browser/profile/resolveChromeProfile'
import type { BrowserSession } from '../browser/session/createBrowserSession'
import { createBrowserSession } from '../browser/session/createBrowserSession'
import { detectPlatformLoginState } from '../browser/session/detectPlatformLoginState'
import { CookieAuthError, createCookieAuthFetcher } from './cookieAuthFetcher'

// eslint-disable-next-line no-unused-vars
type RemoteFeedAdapter = (_searchQuery?: string) => Promise<FeedItem[]>
type BrowserFeedAdapter = typeof fetchXFeed
// eslint-disable-next-line no-unused-vars
type ApiFeedAdapter = (authFetch: (url: string, init?: RequestInit) => Promise<Response>, _searchQuery?: string) => Promise<FeedItem[]>
type DetectPlatformLoginState = typeof detectPlatformLoginState
type BrowserPlatform = 'x' | 'youtube'
type PlatformBuckets = Record<Platform, FeedItem[]>

type CollectTodayFeedResult = {
  platformBuckets: PlatformBuckets
  platformStatuses: PlatformStatus[]
}

export type CollectTodayFeedDependencies = {
  githubAdapter?: RemoteFeedAdapter
  huggingFaceAdapter?: RemoteFeedAdapter
  resolveChromeProfile?: () => Promise<ChromeProfileResolution>
  createBrowserSession?: typeof createBrowserSession
  detectPlatformLoginState?: DetectPlatformLoginState
  xAdapter?: BrowserFeedAdapter
  youtubeAdapter?: BrowserFeedAdapter
  xApiAdapter?: ApiFeedAdapter
  youtubeApiAdapter?: ApiFeedAdapter
  xCdpAdapter?: BrowserFeedAdapter
  // eslint-disable-next-line no-unused-vars
  cookiesRepository?: { save: (platform: string, cookie: string) => void; get: (platform: string) => string | null }
  createCookieAuthFetcher?: typeof createCookieAuthFetcher
  chromeRemoteDebuggingUrl?: string | null
  searchQuery?: string
  xTargetAccounts?: string[]
  xMaxPerAccount?: number
  now?: () => string
}

const PROFILE_UNAVAILABLE_DETAIL: Record<'browser_unavailable' | 'profile_unavailable', string> = {
  browser_unavailable: '本机 Chrome 不可用',
  profile_unavailable: '本机 Chrome profile 不可用'
}

const createPlatformBuckets = (overrides: Partial<PlatformBuckets> = {}): PlatformBuckets => ({
  github: overrides.github ?? [],
  x: overrides.x ?? [],
  youtube: overrides.youtube ?? [],
  huggingface: overrides.huggingface ?? []
})

const createPlatformStatus = ({
  platform,
  state,
  detail,
  hasItems,
  now
}: {
  platform: Platform
  state?: PlatformCollectionState
  detail?: string | null
  hasItems?: boolean
  now: string
}): PlatformStatus => ({
  platform,
  state: state ?? (hasItems ? 'ready' : 'no_results'),
  detail: detail ?? null,
  lastUpdatedAt: now,
  lastCollectedAt: hasItems || state === 'ready' ? now : null
})

const createUnavailablePlatformStatus = ({
  platform,
  resolution,
  now
}: {
  platform: BrowserPlatform
  resolution: ChromeProfileResolution
  now: string
}): PlatformStatus => {
  const reason = resolution.reason ?? 'profile_unavailable'

  return createPlatformStatus({
    platform,
    state: reason,
    detail: PROFILE_UNAVAILABLE_DETAIL[reason],
    now
  })
}

const collectRemotePlatform = async ({
  platform,
  adapter,
  searchQuery: adapterQuery,
  now
}: {
  platform: 'github' | 'huggingface'
  adapter: RemoteFeedAdapter
  searchQuery?: string
  now: string
}): Promise<{ items: FeedItem[]; status: PlatformStatus }> => {
  const items = await adapter(adapterQuery)

  return {
    items,
    status: createPlatformStatus({
      platform,
      hasItems: items.length > 0,
      now
    })
  }
}

const collectBrowserPlatform = async ({
  platform,
  session,
  detectPlatformLoginState,
  adapter,
  searchQuery: adapterQuery,
  now
}: {
  platform: BrowserPlatform
  session: BrowserSession
  detectPlatformLoginState: DetectPlatformLoginState
  adapter: BrowserFeedAdapter
  searchQuery?: string
  now: string
}): Promise<{ items: FeedItem[]; status: PlatformStatus }> => {
  const loginState = await detectPlatformLoginState(platform, session)

  if (loginState.state !== 'ready') {
    return {
      items: [],
      status: {
        ...loginState,
        lastUpdatedAt: now,
        lastCollectedAt: null
      }
    }
  }

  try {
    const items = await adapter(session, adapterQuery)

    return {
      items,
      status: {
        ...loginState,
        detail: items.length > 0 ? null : loginState.detail,
        state: items.length > 0 ? 'ready' : 'no_results',
        lastUpdatedAt: now,
        lastCollectedAt: items.length > 0 ? now : null
      }
    }
  } catch (adapterError) {
    const reason = adapterError instanceof Error ? adapterError.message : '平台抓取失败'
    return {
      items: [],
      status: {
        platform,
        state: 'parse_failed',
        detail: reason,
        lastUpdatedAt: now,
        lastCollectedAt: null
      }
    }
  }
}

const collectBrowserPlatformWithApi = async ({
  platform,
  session,
  detectPlatformLoginState,
  apiAdapter,
  htmlAdapter,
  cdpAdapter,
  cookiesRepo,
  extractCookies,
  createCookieAuthFetcher: createCookieAuthFetcherDependency,
  searchQuery: adapterQuery,
  now
}: {
  platform: BrowserPlatform
  session: BrowserSession
  detectPlatformLoginState: DetectPlatformLoginState
  apiAdapter: ApiFeedAdapter
  htmlAdapter: BrowserFeedAdapter
  cdpAdapter?: BrowserFeedAdapter
  // eslint-disable-next-line no-unused-vars
  cookiesRepo: { save: (platform: string, cookie: string) => void; get: (platform: string) => string | null }
  extractCookies: () => Promise<string>
  createCookieAuthFetcher: typeof createCookieAuthFetcher
  searchQuery?: string
  now: string
}): Promise<{ items: FeedItem[]; status: PlatformStatus }> => {
  if (cdpAdapter) {
    try {
      const items = await cdpAdapter(session, adapterQuery)

      if (items.length > 0) {
        return {
          items,
          status: {
            platform,
            state: 'ready',
            detail: null,
            lastUpdatedAt: now,
            lastCollectedAt: now
          }
        }
      }
    } catch {
    // CDP failed — fall through to API/HTML adapters
  }
  }

  const loginState = await detectPlatformLoginState(platform, session)

  if (loginState.state !== 'ready') {
    return {
      items: [],
      status: {
        ...loginState,
        lastUpdatedAt: now,
        lastCollectedAt: null
      }
    }
  }

  const authFetch = createCookieAuthFetcherDependency({
    platform,
    cookiesRepo,
    extractCookies
  })

  try {
    const items = await apiAdapter(authFetch, adapterQuery)

    if (items.length > 0) {
      return {
        items,
        status: {
          ...loginState,
          detail: null,
          state: 'ready',
          lastUpdatedAt: now,
          lastCollectedAt: now
        }
      }
    }
  } catch (apiError) {
    if (!(apiError instanceof CookieAuthError)) {
      const reason = apiError instanceof Error ? apiError.message : '平台抓取失败'
      return {
        items: [],
        status: {
          platform,
          state: 'parse_failed',
          detail: reason,
          lastUpdatedAt: now,
          lastCollectedAt: null
        }
      }
    }
  }

  try {
    const items = await htmlAdapter(session, adapterQuery)

    return {
      items,
      status: {
        ...loginState,
        detail: items.length > 0 ? null : loginState.detail,
        state: items.length > 0 ? 'ready' : 'no_results',
        lastUpdatedAt: now,
        lastCollectedAt: items.length > 0 ? now : null
      }
    }
  } catch (htmlError) {
    if (loginState.state !== 'ready') {
      return {
        items: [],
        status: {
          ...loginState,
          lastUpdatedAt: now,
          lastCollectedAt: null
        }
      }
    }

    const reason = htmlError instanceof Error ? htmlError.message : '平台抓取失败'
    return {
      items: [],
      status: {
        platform,
        state: 'parse_failed',
        detail: reason,
        lastUpdatedAt: now,
        lastCollectedAt: null
      }
    }
  }
}

export const collectTodayFeed = async ({
  githubAdapter = fetchGithubFeed,
  huggingFaceAdapter = fetchHuggingFaceFeed,
  resolveChromeProfile: resolveChromeProfileDependency = resolveChromeProfile,
  createBrowserSession: createBrowserSessionDependency = createBrowserSession,
  detectPlatformLoginState: detectPlatformLoginStateDependency = detectPlatformLoginState,
  xAdapter = fetchXFeed,
  youtubeAdapter = fetchYouTubeFeed,
  xCdpAdapter = fetchXFeedViaCDP,
  xApiAdapter = fetchXFeedViaApi,
  youtubeApiAdapter = fetchYouTubeFeedViaApi,
  cookiesRepository: cookiesRepo,
  createCookieAuthFetcher: createCookieAuthFetcherDependency = createCookieAuthFetcher,
  chromeRemoteDebuggingUrl = process.env.CHROME_REMOTE_DEBUGGING_URL ?? null,
  searchQuery,
  xTargetAccounts,
  xMaxPerAccount,
  now = () => new Date().toISOString()
}: CollectTodayFeedDependencies = {}): Promise<CollectTodayFeedResult> => {
  const currentTime = now()
  const [githubResult, huggingFaceResult, profileResolution] = await Promise.all([
    collectRemotePlatform({
      platform: 'github',
      adapter: githubAdapter,
      searchQuery,
      now: currentTime
    }),
    collectRemotePlatform({
      platform: 'huggingface',
      adapter: huggingFaceAdapter,
      searchQuery,
      now: currentTime
    }),
    resolveChromeProfileDependency()
  ])

  if (!profileResolution.isAvailable) {
    return {
      platformBuckets: createPlatformBuckets({
        github: githubResult.items,
        huggingface: huggingFaceResult.items
      }),
      platformStatuses: [
        githubResult.status,
        createUnavailablePlatformStatus({
          platform: 'x',
          resolution: profileResolution,
          now: currentTime
        }),
        createUnavailablePlatformStatus({
          platform: 'youtube',
          resolution: profileResolution,
          now: currentTime
        }),
        huggingFaceResult.status
      ]
    }
  }

  const session = await createBrowserSessionDependency({
    browserExecutablePath: profileResolution.browserExecutablePath!,
    userDataDir: profileResolution.automationUserDataDir,
    sourceUserDataDir: profileResolution.userDataDir!,
    sourceProfileDirectory: profileResolution.profileDirectory!,
    remoteDebuggingUrl: profileResolution.remoteDebuggingUrl ?? chromeRemoteDebuggingUrl
  })

  try {
    if (cookiesRepo) {
      await session.getCookies('x').then((cookie) => cookiesRepo.save('x', cookie))
      await session.getCookies('youtube').then((cookie) => cookiesRepo.save('youtube', cookie))
    }

    const accounts = xTargetAccounts?.filter(Boolean) ?? []
    const maxPerAccount = xMaxPerAccount && xMaxPerAccount > 0 ? xMaxPerAccount : undefined
    const usePerAccount = accounts.length > 0 && maxPerAccount !== undefined

    const collectX = async (query: string): Promise<{ items: FeedItem[]; status: PlatformStatus }> => {
      if (cookiesRepo) {
        return collectBrowserPlatformWithApi({
          platform: 'x',
          session,
          detectPlatformLoginState: detectPlatformLoginStateDependency,
          apiAdapter: xApiAdapter,
          htmlAdapter: xAdapter,
          cdpAdapter: xCdpAdapter,
          cookiesRepo,
          extractCookies: () => session.getCookies('x'),
          createCookieAuthFetcher: (deps) => createCookieAuthFetcherDependency({ ...deps, csrfCookieName: 'ct0' }),
          searchQuery: query,
          now: currentTime
        })
      }
      return collectBrowserPlatform({
        platform: 'x',
        session,
        detectPlatformLoginState: detectPlatformLoginStateDependency,
        adapter: xAdapter,
        searchQuery: query,
        now: currentTime
      })
    }

    let xResult: { items: FeedItem[]; status: PlatformStatus }

    if (usePerAccount) {
      const perAccountQueries = accounts.map((account) =>
        buildXSearchQuery(searchQuery ?? '', [account])
      )

      const perAccountResults = await Promise.all(perAccountQueries.map((q) => collectX(q)))

      const seen = new Map<string, FeedItem>()
      for (const result of perAccountResults) {
        for (const item of result.items.slice(0, maxPerAccount)) {
          if (!seen.has(item.id)) seen.set(item.id, item)
        }
      }

      const mergedItems = [...seen.values()].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )

      xResult = {
        items: mergedItems,
        status: {
          platform: 'x',
          state: mergedItems.length > 0 ? 'ready' : 'no_results',
          detail: null,
          lastUpdatedAt: currentTime,
          lastCollectedAt: mergedItems.length > 0 ? currentTime : null
        }
      }
    } else {
      const xQuery = buildXSearchQuery(searchQuery ?? '', accounts)
      xResult = await collectX(xQuery)
    }

    const youtubeResult = cookiesRepo
      ? await collectBrowserPlatformWithApi({
          platform: 'youtube',
          session,
          detectPlatformLoginState: detectPlatformLoginStateDependency,
          apiAdapter: youtubeApiAdapter,
          htmlAdapter: youtubeAdapter,
          cookiesRepo,
          extractCookies: () => session.getCookies('youtube'),
          createCookieAuthFetcher: createCookieAuthFetcherDependency,
          searchQuery,
          now: currentTime
        })
      : await collectBrowserPlatform({
          platform: 'youtube',
          session,
          detectPlatformLoginState: detectPlatformLoginStateDependency,
          adapter: youtubeAdapter,
          searchQuery,
          now: currentTime
        })

    return {
      platformBuckets: createPlatformBuckets({
        github: githubResult.items,
        x: xResult.items,
        youtube: youtubeResult.items,
        huggingface: huggingFaceResult.items
      }),
      platformStatuses: [
        githubResult.status,
        xResult.status,
        youtubeResult.status,
        huggingFaceResult.status
      ]
    }
  } finally {
    await session.close()
  }
}