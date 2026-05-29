# Browser Profile Platform Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Chrome-profile-backed ingestion for Xiaohongshu, X, and YouTube, plus platform-level runtime statuses in the companion service and extension UI.

**Architecture:** Keep the existing local-first split: the companion service owns profile discovery, browser session access, platform adapters, persistence, and localhost APIs; the Chrome extension only reads cached feed data and status data. Add a small browser access layer plus a platform status repository so new adapters and UI states stay isolated from the existing GitHub/Hugging Face pipeline.

**Tech Stack:** TypeScript, Express 5, SQLite (`better-sqlite3`), Zod, React 19, Vitest, Playwright Core (runtime browser control)

---

## Scope Check

This plan stays within one implementation slice because all requested changes serve one product capability: browser-profile-based ingestion for three additional platforms. It does **not** expand into multi-profile switching, cloud infrastructure, raw cookie export, or login automation.

## Delivery Notes

- `/Users/bytedance/Desktop/ai_hot_skill` is currently **not** a git repository, so this plan uses **checkpoint steps instead of commit steps**.
- Keep GitHub and Hugging Face adapters untouched except where new shared contracts require type updates.
- Use `playwright-core` in the companion service runtime instead of `@playwright/test` so the service can launch the locally installed Chrome executable without bundling a test runner into production code.
- Store platform runtime status separately from feed items so the UI can distinguish “no results” from “not logged in” or “profile unavailable.”

## Proposed File Structure

### Shared contracts
- Modify: `packages/shared/src/api.ts` — add the platform-status route constant.
- Modify: `packages/shared/src/feed.ts` — add feed-bucket, platform-status, and today-feed schemas/types.
- Modify: `packages/shared/src/index.ts` — re-export the new schemas and types.

### Companion service browser layer
- Modify: `apps/companion-service/package.json` — add `playwright-core` runtime dependency.
- Create: `apps/companion-service/src/browser/profile/resolveChromeProfile.ts` — detect default Chrome executable and profile.
- Create: `apps/companion-service/src/browser/session/createBrowserSession.ts` — create and close a browser session against the discovered profile.
- Create: `apps/companion-service/src/browser/session/detectPlatformLoginState.ts` — classify X / YouTube / Xiaohongshu login state.

### Companion service persistence and routes
- Modify: `apps/companion-service/src/db/schema.ts` — add `platform_statuses` table SQL.
- Create: `apps/companion-service/src/db/platformStatusRepository.ts` — save and read platform runtime status rows.
- Modify: `apps/companion-service/src/feed/collectTodayFeed.ts` — wire in the three new adapters and return richer collection output.
- Modify: `apps/companion-service/src/scheduler/runDailyUpdate.ts` — persist both feed items and platform status results.
- Modify: `apps/companion-service/src/server/createServer.ts` — inject the new repository into the server.
- Modify: `apps/companion-service/src/server/routes/feed.ts` — build bucket messages from stored platform status.
- Modify: `apps/companion-service/src/server/routes/status.ts` — preserve `/api/status` heartbeat and add `/api/status/platforms`.
- Modify: `apps/companion-service/src/index.ts` — create and pass `platformStatusRepository`.

### Platform adapters
- Create: `apps/companion-service/src/adapters/x/fetchXFeed.ts`
- Create: `apps/companion-service/src/adapters/x/extractXItems.ts`
- Create: `apps/companion-service/src/adapters/youtube/fetchYouTubeFeed.ts`
- Create: `apps/companion-service/src/adapters/youtube/extractYouTubeItems.ts`
- Create: `apps/companion-service/src/adapters/xiaohongshu/fetchXiaohongshuFeed.ts`
- Create: `apps/companion-service/src/adapters/xiaohongshu/extractXiaohongshuItems.ts`

### Extension UI
- Modify: `apps/chrome-extension/src/newtab/lib/fetchTodayFeed.ts` — parse the richer today-feed payload.
- Modify: `apps/chrome-extension/src/newtab/App.tsx` — show platform status messages instead of one generic empty-state string.
- Create: `apps/chrome-extension/src/options/lib/fetchPlatformStatuses.ts` — load the read-only runtime panel data.
- Modify: `apps/chrome-extension/src/options/App.tsx` — render Chrome/profile/login/runtime status panel.

### Tests
- Create: `tests/companion-service/resolve-chrome-profile.test.ts`
- Create: `tests/companion-service/platform-status-repository.test.ts`
- Create: `tests/companion-service/platform-login-state.test.ts`
- Create: `tests/companion-service/fetch-x-feed.test.ts`
- Create: `tests/companion-service/fetch-youtube-feed.test.ts`
- Create: `tests/companion-service/fetch-xiaohongshu-feed.test.ts`
- Modify: `tests/companion-service/collect-today-feed.test.ts`
- Modify: `tests/companion-service/run-daily-update.test.ts`
- Modify: `tests/companion-service/feed-routes.test.ts`
- Modify: `tests/companion-service/status-route.test.ts`
- Modify: `tests/chrome-extension/newtab-status.test.tsx`
- Modify: `tests/chrome-extension/options-page.test.tsx`

## Task 1: Extend shared contracts for platform status and richer feed buckets

**Files:**
- Modify: `packages/shared/src/api.ts`
- Modify: `packages/shared/src/feed.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `tests/companion-service/shared-contracts.test.ts`

- [ ] **Step 1: Write the failing shared-contract test**

```ts
import { describe, expect, test } from 'vitest'
import {
  platformStatusSchema,
  todayFeedSchema,
  API_ROUTES
} from '../../packages/shared/src'

describe('platform ingestion contracts', () => {
  test('parses platform runtime status and today feed buckets', () => {
    const status = platformStatusSchema.parse({
      platform: 'xiaohongshu',
      state: 'not_logged_in',
      detail: '当前浏览器未登录该平台',
      lastUpdatedAt: '2026-05-23T10:00:00.000Z',
      lastCollectedAt: null
    })

    const todayFeed = todayFeedSchema.parse({
      github: { items: [], message: '今日结果较少', state: 'no_results' },
      x: { items: [], message: '当前浏览器未登录该平台', state: 'not_logged_in' },
      youtube: { items: [], message: '浏览器 profile 不可用', state: 'profile_unavailable' },
      xiaohongshu: { items: [], message: '平台抓取失败', state: 'parse_failed' },
      huggingface: { items: [], message: null, state: 'ready' }
    })

    expect(status.state).toBe('not_logged_in')
    expect(todayFeed.x.message).toBe('当前浏览器未登录该平台')
    expect(API_ROUTES.platformStatuses).toBe('/api/status/platforms')
  })
})
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run: `pnpm test -- tests/companion-service/shared-contracts.test.ts`
Expected: FAIL with missing exports such as `platformStatusSchema`, `todayFeedSchema`, or `platformStatuses`.

- [ ] **Step 3: Write the minimal shared contract implementation**

```ts
// packages/shared/src/api.ts
export const API_ROUTES = {
  todayFeed: '/api/feed/today',
  favorites: '/api/favorites',
  settings: '/api/settings',
  status: '/api/status',
  platformStatuses: '/api/status/platforms',
  pushFeishu: '/api/push/feishu',
  pushWechat: '/api/push/wechat'
} as const
```

```ts
// packages/shared/src/feed.ts
import { z } from 'zod'

export const platformSchema = z.enum(['github', 'x', 'youtube', 'xiaohongshu', 'huggingface'])
export const platformCollectionStateSchema = z.enum([
  'ready',
  'no_results',
  'browser_unavailable',
  'profile_unavailable',
  'not_logged_in',
  'session_busy',
  'parse_failed',
  'platform_unavailable'
])

export const feedItemSchema = z.object({
  id: z.string().min(1),
  platform: platformSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  url: z.string().url(),
  author: z.string().min(1),
  publishedAt: z.string().datetime(),
  popularityScore: z.number().nonnegative(),
  growthScore: z.number().nonnegative(),
  rawTags: z.array(z.string()),
  sourceId: z.string().min(1)
})

export const feedBucketSchema = z.object({
  items: z.array(feedItemSchema),
  message: z.string().nullable(),
  state: platformCollectionStateSchema
})

export const todayFeedSchema = z.object({
  github: feedBucketSchema,
  x: feedBucketSchema,
  youtube: feedBucketSchema,
  xiaohongshu: feedBucketSchema,
  huggingface: feedBucketSchema
})

export const platformStatusSchema = z.object({
  platform: platformSchema,
  state: platformCollectionStateSchema,
  detail: z.string().nullable(),
  lastUpdatedAt: z.string().datetime().nullable(),
  lastCollectedAt: z.string().datetime().nullable()
})

export type Platform = z.infer<typeof platformSchema>
export type FeedItem = z.infer<typeof feedItemSchema>
export type FeedBucket = z.infer<typeof feedBucketSchema>
export type TodayFeed = z.infer<typeof todayFeedSchema>
export type PlatformCollectionState = z.infer<typeof platformCollectionStateSchema>
export type PlatformStatus = z.infer<typeof platformStatusSchema>
```

```ts
// packages/shared/src/index.ts
export * from './api'
export * from './favorites'
export * from './feed'
export * from './settings'
```

- [ ] **Step 4: Run the contract test again**

Run: `pnpm test -- tests/companion-service/shared-contracts.test.ts`
Expected: PASS with the new contract parsing successfully.

- [ ] **Step 5: Record the checkpoint**

Run: `pnpm typecheck`
Expected: PASS so later tasks can rely on the new shared types.

## Task 2: Persist platform runtime statuses alongside daily feed data

**Files:**
- Modify: `apps/companion-service/src/db/schema.ts`
- Create: `apps/companion-service/src/db/platformStatusRepository.ts`
- Create: `tests/companion-service/platform-status-repository.test.ts`

- [ ] **Step 1: Write the failing repository test**

```ts
import { describe, expect, test } from 'vitest'
import type { PlatformStatus } from '@ai-hot/shared'

import { createInMemoryDatabase } from '../../apps/companion-service/src/db/client'
import { createPlatformStatusRepository } from '../../apps/companion-service/src/db/platformStatusRepository'

describe('platformStatusRepository', () => {
  test('saves and returns the latest platform statuses', () => {
    const database = createInMemoryDatabase()
    const repository = createPlatformStatusRepository(database)

    const statuses: PlatformStatus[] = [
      {
        platform: 'x',
        state: 'not_logged_in',
        detail: '当前浏览器未登录该平台',
        lastUpdatedAt: '2026-05-23T10:00:00.000Z',
        lastCollectedAt: null
      }
    ]

    repository.replaceAll(statuses)

    expect(repository.getAll()).toEqual(statuses)
  })
})
```

- [ ] **Step 2: Run the repository test to verify it fails**

Run: `pnpm test -- tests/companion-service/platform-status-repository.test.ts`
Expected: FAIL with module not found for `platformStatusRepository`.

- [ ] **Step 3: Write the minimal schema and repository**

```ts
// apps/companion-service/src/db/schema.ts
export const FEED_TABLE_SQL = `...existing feed_items SQL...`

export const PLATFORM_STATUS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS platform_statuses (
    platform TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    detail TEXT,
    last_updated_at TEXT,
    last_collected_at TEXT
  )
`
```

```ts
// apps/companion-service/src/db/platformStatusRepository.ts
import { platformStatusSchema, type PlatformStatus } from '@ai-hot/shared'

import type { SqliteDatabase } from './client'
import { PLATFORM_STATUS_TABLE_SQL } from './schema'

type PlatformStatusRow = {
  platform: string
  state: string
  detail: string | null
  last_updated_at: string | null
  last_collected_at: string | null
}

const mapStatusToRow = (status: PlatformStatus): PlatformStatusRow => ({
  platform: status.platform,
  state: status.state,
  detail: status.detail,
  last_updated_at: status.lastUpdatedAt,
  last_collected_at: status.lastCollectedAt
})

const mapRowToStatus = (row: PlatformStatusRow): PlatformStatus => {
  return platformStatusSchema.parse({
    platform: row.platform,
    state: row.state,
    detail: row.detail,
    lastUpdatedAt: row.last_updated_at,
    lastCollectedAt: row.last_collected_at
  })
}

export const createPlatformStatusRepository = (database: SqliteDatabase) => {
  database.exec(PLATFORM_STATUS_TABLE_SQL)

  return {
    replaceAll(statuses: PlatformStatus[]) {
      const deleteStatement = database.prepare('DELETE FROM platform_statuses')
      const insertStatement = database.prepare(
        `INSERT INTO platform_statuses (
          platform,
          state,
          detail,
          last_updated_at,
          last_collected_at
        ) VALUES (
          @platform,
          @state,
          @detail,
          @last_updated_at,
          @last_collected_at
        )`
      )

      database.transaction((nextStatuses: PlatformStatus[]) => {
        deleteStatement.run()
        nextStatuses.forEach((status) => {
          insertStatement.run(mapStatusToRow(status))
        })
      })(statuses)
    },

    getAll(): PlatformStatus[] {
      const rows = database
        .prepare(
          `SELECT platform, state, detail, last_updated_at, last_collected_at
           FROM platform_statuses
           ORDER BY platform ASC`
        )
        .all() as PlatformStatusRow[]

      return rows.map(mapRowToStatus)
    }
  }
}
```

- [ ] **Step 4: Run the repository test again**

Run: `pnpm test -- tests/companion-service/platform-status-repository.test.ts`
Expected: PASS with the status row round-tripping through SQLite.

- [ ] **Step 5: Record the checkpoint**

Run: `pnpm test -- tests/companion-service/platform-status-repository.test.ts tests/companion-service/feed-repository.test.ts`
Expected: PASS so the new table does not break the existing feed repository.

## Task 3: Add Chrome profile discovery

**Files:**
- Modify: `apps/companion-service/package.json`
- Create: `apps/companion-service/src/browser/profile/resolveChromeProfile.ts`
- Create: `tests/companion-service/resolve-chrome-profile.test.ts`

- [ ] **Step 1: Write the failing profile resolver test**

```ts
import { describe, expect, test } from 'vitest'

import { resolveChromeProfile } from '../../apps/companion-service/src/browser/profile/resolveChromeProfile'

describe('resolveChromeProfile', () => {
  test('returns the default Chrome executable and Default profile when both paths exist', async () => {
    const resolution = await resolveChromeProfile({
      exists: async (path) =>
        path === '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ||
        path === '/Users/test/Library/Application Support/Google/Chrome/Default',
      homeDirectory: '/Users/test'
    })

    expect(resolution).toEqual({
      isAvailable: true,
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      profileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      reason: null
    })
  })
})
```

- [ ] **Step 2: Run the profile resolver test to verify it fails**

Run: `pnpm test -- tests/companion-service/resolve-chrome-profile.test.ts`
Expected: FAIL with module not found for `resolveChromeProfile`.

- [ ] **Step 3: Write the minimal profile resolver and dependency change**

```json
// apps/companion-service/package.json
{
  "name": "@ai-hot/companion-service",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@ai-hot/shared": "workspace:*",
    "express": "^5.2.1",
    "playwright-core": "^1.55.0"
  }
}
```

```ts
// apps/companion-service/src/browser/profile/resolveChromeProfile.ts
import { access } from 'node:fs/promises'
import { join } from 'node:path'

const DEFAULT_CHROME_EXECUTABLE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

type ResolveChromeProfileDependencies = {
  exists?: (path: string) => Promise<boolean>
  homeDirectory?: string
}

type ChromeProfileResolution = {
  isAvailable: boolean
  browserExecutablePath: string | null
  userDataDir: string | null
  profileDirectory: string | null
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

export const resolveChromeProfile = async ({
  exists = defaultExists,
  homeDirectory = process.env.HOME ?? ''
}: ResolveChromeProfileDependencies = {}): Promise<ChromeProfileResolution> => {
  const userDataDir = join(homeDirectory, 'Library/Application Support/Google/Chrome')
  const profileDirectory = join(userDataDir, 'Default')

  if (!(await exists(DEFAULT_CHROME_EXECUTABLE))) {
    return {
      isAvailable: false,
      browserExecutablePath: null,
      userDataDir: null,
      profileDirectory: null,
      reason: 'browser_unavailable'
    }
  }

  if (!(await exists(profileDirectory))) {
    return {
      isAvailable: false,
      browserExecutablePath: DEFAULT_CHROME_EXECUTABLE,
      userDataDir,
      profileDirectory: null,
      reason: 'profile_unavailable'
    }
  }

  return {
    isAvailable: true,
    browserExecutablePath: DEFAULT_CHROME_EXECUTABLE,
    userDataDir,
    profileDirectory,
    reason: null
  }
}
```

- [ ] **Step 4: Install dependencies and rerun the resolver test**

Run: `pnpm install && pnpm test -- tests/companion-service/resolve-chrome-profile.test.ts`
Expected: PASS with one resolver test passing.

- [ ] **Step 5: Record the checkpoint**

Run: `pnpm typecheck`
Expected: PASS with `playwright-core` available to later browser-session work.

## Task 4: Add the browser session gateway and login-state detector

**Files:**
- Create: `apps/companion-service/src/browser/session/createBrowserSession.ts`
- Create: `apps/companion-service/src/browser/session/detectPlatformLoginState.ts`
- Create: `tests/companion-service/platform-login-state.test.ts`

- [ ] **Step 1: Write the failing login-state test**

```ts
import { describe, expect, test, vi } from 'vitest'

import { detectPlatformLoginState } from '../../apps/companion-service/src/browser/session/detectPlatformLoginState'

describe('detectPlatformLoginState', () => {
  test('returns not_logged_in when the platform checker reports no active session', async () => {
    const session = {
      isLoggedIn: vi.fn().mockResolvedValue(false)
    }

    const state = await detectPlatformLoginState('youtube', session as never)

    expect(state).toEqual({
      platform: 'youtube',
      state: 'not_logged_in',
      detail: '当前浏览器未登录该平台',
      lastUpdatedAt: null,
      lastCollectedAt: null
    })
  })
})
```

- [ ] **Step 2: Run the login-state test to verify it fails**

Run: `pnpm test -- tests/companion-service/platform-login-state.test.ts`
Expected: FAIL with module not found for `detectPlatformLoginState`.

- [ ] **Step 3: Write the minimal browser session gateway and detector**

```ts
// apps/companion-service/src/browser/session/createBrowserSession.ts
import { chromium, type BrowserContext, type Page } from 'playwright-core'

export type BrowserSession = {
  openPage: (url: string) => Promise<Page>
  isLoggedIn: (platform: 'x' | 'youtube' | 'xiaohongshu') => Promise<boolean>
  close: () => Promise<void>
}

type CreateBrowserSessionDependencies = {
  browserExecutablePath: string
  userDataDir: string
}

export const createBrowserSession = async ({
  browserExecutablePath,
  userDataDir
}: CreateBrowserSessionDependencies): Promise<BrowserSession> => {
  const context: BrowserContext = await chromium.launchPersistentContext(userDataDir, {
    executablePath: browserExecutablePath,
    headless: true
  })

  return {
    async openPage(url: string) {
      const page = await context.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      return page
    },
    async isLoggedIn(platform) {
      const page = await context.newPage()
      const loginUrl =
        platform === 'x'
          ? 'https://x.com/home'
          : platform === 'youtube'
            ? 'https://www.youtube.com/feed/subscriptions'
            : 'https://www.xiaohongshu.com/'
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded' })
      const content = await page.content()
      await page.close()
      return !content.includes('登录') && !content.includes('Sign in')
    },
    async close() {
      await context.close()
    }
  }
}
```

```ts
// apps/companion-service/src/browser/session/detectPlatformLoginState.ts
import type { PlatformStatus } from '@ai-hot/shared'

import type { BrowserSession } from './createBrowserSession'

export const detectPlatformLoginState = async (
  platform: 'x' | 'youtube' | 'xiaohongshu',
  session: BrowserSession
): Promise<PlatformStatus> => {
  const isLoggedIn = await session.isLoggedIn(platform)

  return {
    platform,
    state: isLoggedIn ? 'ready' : 'not_logged_in',
    detail: isLoggedIn ? null : '当前浏览器未登录该平台',
    lastUpdatedAt: null,
    lastCollectedAt: null
  }
}
```

- [ ] **Step 4: Run the login-state test again**

Run: `pnpm test -- tests/companion-service/platform-login-state.test.ts`
Expected: PASS with one detector test passing.

- [ ] **Step 5: Record the checkpoint**

Run: `pnpm test -- tests/companion-service/platform-login-state.test.ts tests/companion-service/resolve-chrome-profile.test.ts`
Expected: PASS before platform adapters build on this layer.

## Task 5: Implement the Xiaohongshu adapter first

**Files:**
- Create: `apps/companion-service/src/adapters/xiaohongshu/extractXiaohongshuItems.ts`
- Create: `apps/companion-service/src/adapters/xiaohongshu/fetchXiaohongshuFeed.ts`
- Create: `tests/companion-service/fetch-xiaohongshu-feed.test.ts`

- [ ] **Step 1: Write the failing Xiaohongshu adapter test**

```ts
import { describe, expect, test } from 'vitest'

import { extractXiaohongshuItems } from '../../apps/companion-service/src/adapters/xiaohongshu/extractXiaohongshuItems'

describe('extractXiaohongshuItems', () => {
  test('maps note cards into feed items', () => {
    const items = extractXiaohongshuItems(`
      <section>
        <a href="https://www.xiaohongshu.com/explore/abc123">
          <h2>AI Agent 工作流</h2>
          <span>作者甲</span>
          <time datetime="2026-05-23T08:00:00.000Z"></time>
          <span data-likes="320"></span>
        </a>
      </section>
    `)

    expect(items).toEqual([
      {
        id: 'xiaohongshu:abc123',
        platform: 'xiaohongshu',
        title: 'AI Agent 工作流',
        summary: '热门小红书 AI 笔记',
        url: 'https://www.xiaohongshu.com/explore/abc123',
        author: '作者甲',
        publishedAt: '2026-05-23T08:00:00.000Z',
        popularityScore: 320,
        growthScore: 0,
        rawTags: ['xiaohongshu'],
        sourceId: 'abc123'
      }
    ])
  })
})
```

- [ ] **Step 2: Run the Xiaohongshu adapter test to verify it fails**

Run: `pnpm test -- tests/companion-service/fetch-xiaohongshu-feed.test.ts`
Expected: FAIL with module not found for `extractXiaohongshuItems`.

- [ ] **Step 3: Write the minimal parser and fetch wrapper**

```ts
// apps/companion-service/src/adapters/xiaohongshu/extractXiaohongshuItems.ts
import { JSDOM } from 'jsdom'
import { feedItemSchema, type FeedItem } from '@ai-hot/shared'

const DEFAULT_SUMMARY = '热门小红书 AI 笔记'

export const extractXiaohongshuItems = (html: string): FeedItem[] => {
  const document = new JSDOM(html).window.document

  return Array.from(document.querySelectorAll('a[href*="/explore/"]')).slice(0, 10).map((anchor) => {
    const url = anchor.getAttribute('href') ?? ''
    const sourceId = url.split('/').at(-1) ?? 'unknown'
    const title = anchor.querySelector('h2')?.textContent?.trim() ?? '小红书内容'
    const author = anchor.querySelector('span')?.textContent?.trim() ?? 'xiaohongshu'
    const publishedAt =
      anchor.querySelector('time')?.getAttribute('datetime') ?? '2026-05-23T00:00:00.000Z'
    const popularityScore = Number(anchor.querySelector('[data-likes]')?.getAttribute('data-likes') ?? '0')

    return feedItemSchema.parse({
      id: `xiaohongshu:${sourceId}`,
      platform: 'xiaohongshu',
      title,
      summary: DEFAULT_SUMMARY,
      url,
      author,
      publishedAt,
      popularityScore,
      growthScore: 0,
      rawTags: ['xiaohongshu'],
      sourceId
    })
  })
}
```

```ts
// apps/companion-service/src/adapters/xiaohongshu/fetchXiaohongshuFeed.ts
import type { FeedItem } from '@ai-hot/shared'

import type { BrowserSession } from '../../browser/session/createBrowserSession'
import { extractXiaohongshuItems } from './extractXiaohongshuItems'

const XIAOHONGSHU_URL = 'https://www.xiaohongshu.com/search_result?keyword=AI'

export const fetchXiaohongshuFeed = async (session: BrowserSession): Promise<FeedItem[]> => {
  const page = await session.openPage(XIAOHONGSHU_URL)
  const html = await page.content()
  await page.close()
  return extractXiaohongshuItems(html)
}
```

- [ ] **Step 4: Run the Xiaohongshu adapter test again**

Run: `pnpm test -- tests/companion-service/fetch-xiaohongshu-feed.test.ts`
Expected: PASS with one adapter test passing.

- [ ] **Step 5: Record the checkpoint**

Run: `pnpm test -- tests/companion-service/fetch-xiaohongshu-feed.test.ts tests/companion-service/platform-login-state.test.ts`
Expected: PASS before integrating the adapter into the daily pipeline.

## Task 6: Implement the X adapter

**Files:**
- Create: `apps/companion-service/src/adapters/x/extractXItems.ts`
- Create: `apps/companion-service/src/adapters/x/fetchXFeed.ts`
- Create: `tests/companion-service/fetch-x-feed.test.ts`

- [ ] **Step 1: Write the failing X adapter test**

```ts
import { describe, expect, test } from 'vitest'

import { extractXItems } from '../../apps/companion-service/src/adapters/x/extractXItems'

describe('extractXItems', () => {
  test('maps tweet cards into feed items', () => {
    const items = extractXItems(`
      <article data-testid="tweet">
        <a href="https://x.com/agentic/status/42">link</a>
        <div lang="en">New open-source AI agent release</div>
        <div data-testid="User-Name">agentic</div>
        <time datetime="2026-05-23T09:00:00.000Z"></time>
        <span data-retweets="84"></span>
      </article>
    `)

    expect(items[0].platform).toBe('x')
    expect(items[0].url).toBe('https://x.com/agentic/status/42')
    expect(items[0].author).toBe('agentic')
  })
})
```

- [ ] **Step 2: Run the X adapter test to verify it fails**

Run: `pnpm test -- tests/companion-service/fetch-x-feed.test.ts`
Expected: FAIL with module not found for `extractXItems`.

- [ ] **Step 3: Write the minimal parser and fetch wrapper**

```ts
// apps/companion-service/src/adapters/x/extractXItems.ts
import { JSDOM } from 'jsdom'
import { feedItemSchema, type FeedItem } from '@ai-hot/shared'

const DEFAULT_SUMMARY = '热门 X / Twitter AI 内容'

export const extractXItems = (html: string): FeedItem[] => {
  const document = new JSDOM(html).window.document

  return Array.from(document.querySelectorAll('article[data-testid="tweet"]')).slice(0, 10).map((article) => {
    const url = article.querySelector('a[href*="/status/"]')?.getAttribute('href') ?? ''
    const sourceId = url.split('/status/').at(1) ?? 'unknown'
    const title = article.querySelector('[lang]')?.textContent?.trim() ?? 'X content'
    const author = article.querySelector('[data-testid="User-Name"]')?.textContent?.trim() ?? 'x'
    const publishedAt = article.querySelector('time')?.getAttribute('datetime') ?? '2026-05-23T00:00:00.000Z'
    const popularityScore = Number(article.querySelector('[data-retweets]')?.getAttribute('data-retweets') ?? '0')

    return feedItemSchema.parse({
      id: `x:${sourceId}`,
      platform: 'x',
      title,
      summary: DEFAULT_SUMMARY,
      url,
      author,
      publishedAt,
      popularityScore,
      growthScore: 0,
      rawTags: ['x'],
      sourceId
    })
  })
}
```

```ts
// apps/companion-service/src/adapters/x/fetchXFeed.ts
import type { FeedItem } from '@ai-hot/shared'

import type { BrowserSession } from '../../browser/session/createBrowserSession'
import { extractXItems } from './extractXItems'

const X_URL = 'https://x.com/search?q=AI&src=typed_query&f=live'

export const fetchXFeed = async (session: BrowserSession): Promise<FeedItem[]> => {
  const page = await session.openPage(X_URL)
  const html = await page.content()
  await page.close()
  return extractXItems(html)
}
```

- [ ] **Step 4: Run the X adapter test again**

Run: `pnpm test -- tests/companion-service/fetch-x-feed.test.ts`
Expected: PASS with one adapter test passing.

- [ ] **Step 5: Record the checkpoint**

Run: `pnpm test -- tests/companion-service/fetch-x-feed.test.ts tests/companion-service/fetch-xiaohongshu-feed.test.ts`
Expected: PASS before integration.

## Task 7: Implement the YouTube adapter

**Files:**
- Create: `apps/companion-service/src/adapters/youtube/extractYouTubeItems.ts`
- Create: `apps/companion-service/src/adapters/youtube/fetchYouTubeFeed.ts`
- Create: `tests/companion-service/fetch-youtube-feed.test.ts`

- [ ] **Step 1: Write the failing YouTube adapter test**

```ts
import { describe, expect, test } from 'vitest'

import { extractYouTubeItems } from '../../apps/companion-service/src/adapters/youtube/extractYouTubeItems'

describe('extractYouTubeItems', () => {
  test('maps ytd-rich-item-renderer cards into feed items', () => {
    const items = extractYouTubeItems(`
      <ytd-rich-item-renderer>
        <a id="video-title-link" href="https://www.youtube.com/watch?v=abc123">Claude Code demo</a>
        <yt-formatted-string id="channel-name">AI Lab</yt-formatted-string>
        <span id="metadata-line">124K views</span>
        <time datetime="2026-05-23T07:30:00.000Z"></time>
      </ytd-rich-item-renderer>
    `)

    expect(items[0].platform).toBe('youtube')
    expect(items[0].sourceId).toBe('abc123')
  })
})
```

- [ ] **Step 2: Run the YouTube adapter test to verify it fails**

Run: `pnpm test -- tests/companion-service/fetch-youtube-feed.test.ts`
Expected: FAIL with module not found for `extractYouTubeItems`.

- [ ] **Step 3: Write the minimal parser and fetch wrapper**

```ts
// apps/companion-service/src/adapters/youtube/extractYouTubeItems.ts
import { JSDOM } from 'jsdom'
import { feedItemSchema, type FeedItem } from '@ai-hot/shared'

const DEFAULT_SUMMARY = '热门 YouTube AI 视频'

const parseViewCount = (value: string): number => {
  const normalized = value.replace(/[^0-9.]/g, '')
  return normalized === '' ? 0 : Number(normalized)
}

export const extractYouTubeItems = (html: string): FeedItem[] => {
  const document = new JSDOM(html).window.document

  return Array.from(document.querySelectorAll('ytd-rich-item-renderer')).slice(0, 10).map((card) => {
    const url = card.querySelector('#video-title-link')?.getAttribute('href') ?? ''
    const sourceId = new URL(url).searchParams.get('v') ?? 'unknown'
    const title = card.querySelector('#video-title-link')?.textContent?.trim() ?? 'YouTube video'
    const author = card.querySelector('#channel-name')?.textContent?.trim() ?? 'youtube'
    const publishedAt = card.querySelector('time')?.getAttribute('datetime') ?? '2026-05-23T00:00:00.000Z'
    const popularityScore = parseViewCount(card.querySelector('#metadata-line')?.textContent ?? '')

    return feedItemSchema.parse({
      id: `youtube:${sourceId}`,
      platform: 'youtube',
      title,
      summary: DEFAULT_SUMMARY,
      url,
      author,
      publishedAt,
      popularityScore,
      growthScore: 0,
      rawTags: ['youtube'],
      sourceId
    })
  })
}
```

```ts
// apps/companion-service/src/adapters/youtube/fetchYouTubeFeed.ts
import type { FeedItem } from '@ai-hot/shared'

import type { BrowserSession } from '../../browser/session/createBrowserSession'
import { extractYouTubeItems } from './extractYouTubeItems'

const YOUTUBE_URL = 'https://www.youtube.com/feed/subscriptions'

export const fetchYouTubeFeed = async (session: BrowserSession): Promise<FeedItem[]> => {
  const page = await session.openPage(YOUTUBE_URL)
  const html = await page.content()
  await page.close()
  return extractYouTubeItems(html)
}
```

- [ ] **Step 4: Run the YouTube adapter test again**

Run: `pnpm test -- tests/companion-service/fetch-youtube-feed.test.ts`
Expected: PASS with one adapter test passing.

- [ ] **Step 5: Record the checkpoint**

Run: `pnpm test -- tests/companion-service/fetch-youtube-feed.test.ts tests/companion-service/fetch-x-feed.test.ts`
Expected: PASS before pipeline integration.

## Task 8: Integrate new adapters into daily collection and status persistence

**Files:**
- Modify: `apps/companion-service/src/feed/collectTodayFeed.ts`
- Modify: `apps/companion-service/src/scheduler/runDailyUpdate.ts`
- Modify: `tests/companion-service/collect-today-feed.test.ts`
- Modify: `tests/companion-service/run-daily-update.test.ts`

- [ ] **Step 1: Write the failing collection and daily-update tests**

```ts
import { describe, expect, test, vi } from 'vitest'
import type { FeedItem, PlatformStatus } from '@ai-hot/shared'

import { collectTodayFeed } from '../../apps/companion-service/src/feed/collectTodayFeed'

describe('collectTodayFeed', () => {
  test('returns platform items and statuses for all five platforms', async () => {
    const collectResult = await collectTodayFeed({
      githubAdapter: vi.fn().mockResolvedValue([{ id: 'github:1' } as FeedItem]),
      huggingFaceAdapter: vi.fn().mockResolvedValue([{ id: 'huggingface:1' } as FeedItem]),
      xAdapter: vi.fn().mockResolvedValue([{ id: 'x:1' } as FeedItem]),
      youtubeAdapter: vi.fn().mockResolvedValue([{ id: 'youtube:1' } as FeedItem]),
      xiaohongshuAdapter: vi.fn().mockResolvedValue([{ id: 'xiaohongshu:1' } as FeedItem])
    })

    expect(collectResult.platformStatuses).toHaveLength(5)
    expect(collectResult.platformBuckets.x).toHaveLength(1)
    expect(collectResult.platformBuckets.youtube).toHaveLength(1)
    expect(collectResult.platformBuckets.xiaohongshu).toHaveLength(1)
  })
})
```

```ts
import { describe, expect, test, vi } from 'vitest'
import type { FeedItem, PlatformStatus } from '@ai-hot/shared'

import { runDailyUpdate } from '../../apps/companion-service/src/scheduler/runDailyUpdate'

describe('runDailyUpdate', () => {
  test('persists summarized feed items and platform statuses', async () => {
    const replaceTodayFeed = vi.fn()
    const replacePlatformStatuses = vi.fn()

    await runDailyUpdate({
      collectTodayFeed: async () => ({
        platformBuckets: {
          github: [] as FeedItem[],
          x: [] as FeedItem[],
          youtube: [] as FeedItem[],
          xiaohongshu: [] as FeedItem[],
          huggingface: [] as FeedItem[]
        },
        platformStatuses: [
          {
            platform: 'x',
            state: 'not_logged_in',
            detail: '当前浏览器未登录该平台',
            lastUpdatedAt: '2026-05-23T10:00:00.000Z',
            lastCollectedAt: null
          }
        ] as PlatformStatus[]
      }),
      summarizeItems: async (items) => items,
      replaceTodayFeed,
      replacePlatformStatuses
    })

    expect(replaceTodayFeed).toHaveBeenCalledTimes(1)
    expect(replacePlatformStatuses).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the collection tests to verify they fail**

Run: `pnpm test -- tests/companion-service/collect-today-feed.test.ts tests/companion-service/run-daily-update.test.ts`
Expected: FAIL because `collectTodayFeed` still returns only raw buckets and `runDailyUpdate` cannot persist statuses.

- [ ] **Step 3: Write the minimal integration changes**

```ts
// apps/companion-service/src/feed/collectTodayFeed.ts
import type { FeedItem, PlatformStatus } from '@ai-hot/shared'

import { fetchGithubFeed } from '../adapters/github/fetchGithubFeed'
import { fetchHuggingFaceFeed } from '../adapters/huggingface/fetchHuggingFaceFeed'
import { fetchXFeed } from '../adapters/x/fetchXFeed'
import { fetchYouTubeFeed } from '../adapters/youtube/fetchYouTubeFeed'
import { fetchXiaohongshuFeed } from '../adapters/xiaohongshu/fetchXiaohongshuFeed'

type PlatformBuckets = {
  github: FeedItem[]
  x: FeedItem[]
  youtube: FeedItem[]
  xiaohongshu: FeedItem[]
  huggingface: FeedItem[]
}

type CollectTodayFeedResult = {
  platformBuckets: PlatformBuckets
  platformStatuses: PlatformStatus[]
}

const createReadyStatus = (platform: PlatformStatus['platform'], itemCount: number): PlatformStatus => ({
  platform,
  state: itemCount === 0 ? 'no_results' : 'ready',
  detail: itemCount === 0 ? '今日结果较少' : null,
  lastUpdatedAt: new Date().toISOString(),
  lastCollectedAt: itemCount === 0 ? null : new Date().toISOString()
})

export const collectTodayFeed = async ({
  githubAdapter = fetchGithubFeed,
  huggingFaceAdapter = fetchHuggingFaceFeed,
  xAdapter,
  youtubeAdapter,
  xiaohongshuAdapter
}: {
  githubAdapter?: () => Promise<FeedItem[]>
  huggingFaceAdapter?: () => Promise<FeedItem[]>
  xAdapter?: () => Promise<FeedItem[]>
  youtubeAdapter?: () => Promise<FeedItem[]>
  xiaohongshuAdapter?: () => Promise<FeedItem[]>
} = {}): Promise<CollectTodayFeedResult> => {
  const [github, x, youtube, xiaohongshu, huggingface] = await Promise.all([
    githubAdapter(),
    xAdapter ? xAdapter() : Promise.resolve([]),
    youtubeAdapter ? youtubeAdapter() : Promise.resolve([]),
    xiaohongshuAdapter ? xiaohongshuAdapter() : Promise.resolve([]),
    huggingFaceAdapter()
  ])

  return {
    platformBuckets: { github, x, youtube, xiaohongshu, huggingface },
    platformStatuses: [
      createReadyStatus('github', github.length),
      createReadyStatus('x', x.length),
      createReadyStatus('youtube', youtube.length),
      createReadyStatus('xiaohongshu', xiaohongshu.length),
      createReadyStatus('huggingface', huggingface.length)
    ]
  }
}
```

```ts
// apps/companion-service/src/scheduler/runDailyUpdate.ts
import type { FeedItem, PlatformStatus } from '@ai-hot/shared'

const PLATFORM_ORDER = ['github', 'x', 'youtube', 'xiaohongshu', 'huggingface'] as const

type PlatformBuckets = Record<(typeof PLATFORM_ORDER)[number], FeedItem[]>

type RunDailyUpdateDependencies = {
  collectTodayFeed: () => Promise<{
    platformBuckets: PlatformBuckets
    platformStatuses: PlatformStatus[]
  }>
  summarizeItems: (items: FeedItem[]) => Promise<FeedItem[]>
  replaceTodayFeed: (items: FeedItem[]) => void | Promise<void>
  replacePlatformStatuses: (statuses: PlatformStatus[]) => void | Promise<void>
}

export const runDailyUpdate = async ({
  collectTodayFeed,
  summarizeItems,
  replaceTodayFeed,
  replacePlatformStatuses
}: RunDailyUpdateDependencies): Promise<FeedItem[]> => {
  const { platformBuckets, platformStatuses } = await collectTodayFeed()
  const summarizedItems = await summarizeItems(PLATFORM_ORDER.flatMap((platform) => platformBuckets[platform]))

  await replaceTodayFeed(summarizedItems)
  await replacePlatformStatuses(platformStatuses)

  return summarizedItems
}
```

- [ ] **Step 4: Run the collection tests again**

Run: `pnpm test -- tests/companion-service/collect-today-feed.test.ts tests/companion-service/run-daily-update.test.ts`
Expected: PASS with the richer pipeline shape.

- [ ] **Step 5: Record the checkpoint**

Run: `pnpm test -- tests/companion-service/collect-today-feed.test.ts tests/companion-service/run-daily-update.test.ts tests/companion-service/platform-status-repository.test.ts`
Expected: PASS before the new route work begins.

## Task 9: Expose platform runtime statuses through feed and status routes

**Files:**
- Modify: `apps/companion-service/src/server/routes/feed.ts`
- Modify: `apps/companion-service/src/server/routes/status.ts`
- Modify: `apps/companion-service/src/server/createServer.ts`
- Modify: `apps/companion-service/src/index.ts`
- Modify: `tests/companion-service/feed-routes.test.ts`
- Modify: `tests/companion-service/status-route.test.ts`

- [ ] **Step 1: Write the failing route tests**

```ts
import { describe, expect, test } from 'vitest'
import { API_ROUTES } from '@ai-hot/shared'

import { createServer } from '../../apps/companion-service/src/server/createServer'

describe('companion service feed routes', () => {
  test('returns platform bucket messages from stored platform statuses', async () => {
    const app = createServer({
      feedRepository: { getTodayFeedByPlatform: () => [] },
      platformStatusRepository: {
        getAll: () => [
          {
            platform: 'x',
            state: 'not_logged_in',
            detail: '当前浏览器未登录该平台',
            lastUpdatedAt: '2026-05-23T10:00:00.000Z',
            lastCollectedAt: null
          }
        ]
      }
    })

    const response = await fetch('http://127.0.0.1:4317' + API_ROUTES.todayFeed)
    const payload = await response.json()

    expect(payload.data.x.message).toBe('当前浏览器未登录该平台')
    expect(payload.data.x.state).toBe('not_logged_in')
  })
})
```

```ts
import { describe, expect, test } from 'vitest'
import { API_ROUTES } from '@ai-hot/shared'

import { createServer } from '../../apps/companion-service/src/server/createServer'

describe('companion service status route', () => {
  test('returns stored platform statuses at /api/status/platforms', async () => {
    const app = createServer({
      platformStatusRepository: {
        getAll: () => [
          {
            platform: 'youtube',
            state: 'ready',
            detail: null,
            lastUpdatedAt: '2026-05-23T10:00:00.000Z',
            lastCollectedAt: '2026-05-23T10:00:00.000Z'
          }
        ]
      }
    })

    const response = await fetch('http://127.0.0.1:4317' + API_ROUTES.platformStatuses)
    const payload = await response.json()

    expect(payload.data[0].platform).toBe('youtube')
  })
})
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `pnpm test -- tests/companion-service/feed-routes.test.ts tests/companion-service/status-route.test.ts`
Expected: FAIL because `platformStatusRepository` is not yet injected or routed.

- [ ] **Step 3: Write the minimal route and server changes**

```ts
// apps/companion-service/src/server/routes/feed.ts
import {
  API_ROUTES,
  type FeedItem,
  type FeedBucket,
  type Platform,
  type PlatformCollectionState,
  type PlatformStatus
} from '@ai-hot/shared'
import { Router } from 'express'

const DEFAULT_EMPTY_MESSAGE = '今日结果较少'

type FeedRepository = {
  getTodayFeedByPlatform: (platform: Platform) => FeedItem[]
}

type PlatformStatusRepository = {
  getAll: () => PlatformStatus[]
}

const createBucket = (items: FeedItem[], status: PlatformStatus | undefined): FeedBucket => ({
  items,
  message: items.length > 0 ? null : status?.detail ?? DEFAULT_EMPTY_MESSAGE,
  state: items.length > 0 ? 'ready' : status?.state ?? 'no_results'
})

export const createFeedRouter = (
  feedRepository: FeedRepository,
  platformStatusRepository: PlatformStatusRepository
) => {
  const feedRouter = Router()

  feedRouter.get(API_ROUTES.todayFeed, (_request, response) => {
    const statuses = new Map(platformStatusRepository.getAll().map((status) => [status.platform, status]))

    response.status(200).json({
      success: true,
      data: {
        github: createBucket(feedRepository.getTodayFeedByPlatform('github'), statuses.get('github')),
        x: createBucket(feedRepository.getTodayFeedByPlatform('x'), statuses.get('x')),
        youtube: createBucket(feedRepository.getTodayFeedByPlatform('youtube'), statuses.get('youtube')),
        xiaohongshu: createBucket(feedRepository.getTodayFeedByPlatform('xiaohongshu'), statuses.get('xiaohongshu')),
        huggingface: createBucket(feedRepository.getTodayFeedByPlatform('huggingface'), statuses.get('huggingface'))
      },
      error: null
    })
  })

  return feedRouter
}
```

```ts
// apps/companion-service/src/server/routes/status.ts
import { API_ROUTES, type PlatformStatus } from '@ai-hot/shared'
import { Router } from 'express'

type PlatformStatusRepository = {
  getAll: () => PlatformStatus[]
}

export const createStatusRouter = (
  platformStatusRepository: PlatformStatusRepository = { getAll: () => [] }
) => {
  const statusRouter = Router()

  statusRouter.get(API_ROUTES.status, (_request, response) => {
    response.status(200).json({
      success: true,
      data: { status: 'ok' },
      error: null
    })
  })

  statusRouter.get(API_ROUTES.platformStatuses, (_request, response) => {
    response.status(200).json({
      success: true,
      data: platformStatusRepository.getAll(),
      error: null
    })
  })

  return statusRouter
}
```

```ts
// apps/companion-service/src/server/createServer.ts
import express from 'express'

import { createFavoritesRouter } from './routes/favorites'
import { createFeedRouter } from './routes/feed'
import { createPushRouter } from './routes/push'
import { createSettingsRouter } from './routes/settings'
import { createStatusRouter } from './routes/status'

type CreateServerDependencies = {
  favoritesRepository?: FavoritesRepository
  feedRepository?: FeedRepository
  settingsRepository?: SettingsRepository
  platformStatusRepository?: { getAll: () => PlatformStatus[] }
}

export const createServer = ({
  favoritesRepository,
  feedRepository,
  settingsRepository,
  platformStatusRepository = { getAll: () => [] }
}: CreateServerDependencies = {}) => {
  const app = express()

  app.use(/* existing CORS middleware */)
  app.use(express.json())
  app.use(createStatusRouter(platformStatusRepository))
  app.use(createFeedRouter(feedRepository ?? createEmptyFeedRepository(), platformStatusRepository))
  app.use(createFavoritesRouter(favoritesRepository))
  app.use(createSettingsRouter(settingsRepository))
  app.use(createPushRouter(settingsRepository))

  return app
}
```

```ts
// apps/companion-service/src/index.ts
const platformStatusRepository = createPlatformStatusRepository(database)
const app = createServer({
  favoritesRepository,
  feedRepository,
  settingsRepository,
  platformStatusRepository
})
```

- [ ] **Step 4: Run the route tests again**

Run: `pnpm test -- tests/companion-service/feed-routes.test.ts tests/companion-service/status-route.test.ts`
Expected: PASS with feed messages and `/api/status/platforms` working.

- [ ] **Step 5: Record the checkpoint**

Run: `pnpm test -- tests/companion-service/feed-routes.test.ts tests/companion-service/status-route.test.ts tests/companion-service/platform-status-repository.test.ts`
Expected: PASS before frontend work starts.

## Task 10: Upgrade the new-tab page and settings page for platform runtime statuses

**Files:**
- Modify: `apps/chrome-extension/src/newtab/lib/fetchTodayFeed.ts`
- Modify: `apps/chrome-extension/src/newtab/App.tsx`
- Create: `apps/chrome-extension/src/options/lib/fetchPlatformStatuses.ts`
- Modify: `apps/chrome-extension/src/options/App.tsx`
- Modify: `tests/chrome-extension/newtab-status.test.tsx`
- Modify: `tests/chrome-extension/options-page.test.tsx`

- [ ] **Step 1: Write the failing frontend tests**

```tsx
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'

import { App } from '../../apps/chrome-extension/src/newtab/App'

describe('new tab status app', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('shows platform-specific empty-state copy from the feed payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              github: { items: [], message: '今日结果较少', state: 'no_results' },
              x: { items: [], message: '当前浏览器未登录该平台', state: 'not_logged_in' },
              youtube: { items: [], message: '浏览器 profile 不可用', state: 'profile_unavailable' },
              xiaohongshu: { items: [], message: '平台抓取失败', state: 'parse_failed' },
              huggingface: { items: [], message: null, state: 'ready' }
            },
            error: null
          })
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [], error: null }) })
    )

    render(<App />)

    expect(await screen.findByText('当前浏览器未登录该平台')).toBeDefined()
    expect(screen.getByText('浏览器 profile 不可用')).toBeDefined()
    expect(screen.getByText('平台抓取失败')).toBeDefined()
  })
})
```

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { OptionsApp } from '../../apps/chrome-extension/src/options/App'

describe('options page', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('shows platform runtime status after loading settings', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: createDefaultSettings(), error: null }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              platform: 'x',
              state: 'not_logged_in',
              detail: '当前浏览器未登录该平台',
              lastUpdatedAt: '2026-05-23T10:00:00.000Z',
              lastCollectedAt: null
            }
          ],
          error: null
        })
      })

    vi.stubGlobal('fetch', fetchMock)

    render(<OptionsApp />)

    expect(await screen.findByText('当前浏览器未登录该平台')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run the frontend tests to verify they fail**

Run: `pnpm test -- tests/chrome-extension/newtab-status.test.tsx tests/chrome-extension/options-page.test.tsx`
Expected: FAIL because the current UI does not load or display platform runtime statuses.

- [ ] **Step 3: Write the minimal frontend changes**

```ts
// apps/chrome-extension/src/newtab/lib/fetchTodayFeed.ts
import { API_ROUTES, todayFeedSchema, type TodayFeed } from '@ai-hot/shared'

const COMPANION_SERVICE_ORIGIN = 'http://127.0.0.1:4317'

type FeedPayload = {
  success: boolean
  data: TodayFeed | null
  error: string | null
}

export const fetchTodayFeed = async (fetchImplementation: typeof fetch = fetch): Promise<TodayFeed> => {
  const response = await fetchImplementation(`${COMPANION_SERVICE_ORIGIN}${API_ROUTES.todayFeed}`)

  if (!response.ok) {
    throw new Error('feed request failed')
  }

  const payload = (await response.json()) as FeedPayload

  if (!payload.success || !payload.data) {
    throw new Error(payload.error ?? 'feed request failed')
  }

  return todayFeedSchema.parse(payload.data)
}
```

```tsx
// apps/chrome-extension/src/newtab/App.tsx
{connectionStatus === 'connected' && !hasFeedError && visibleBuckets.length > 0 ? (
  <div style={APP_STYLES.sections}>
    {visibleBuckets.map((bucket) => (
      <PlatformSection
        key={bucket.platform}
        favoriteItemIds={favoriteItemIds}
        title={bucket.title}
        items={bucket.items}
        message={bucket.message}
        onFavorite={handleFavorite}
      />
    ))}
  </div>
) : null}
```

```ts
// apps/chrome-extension/src/options/lib/fetchPlatformStatuses.ts
import { API_ROUTES, platformStatusSchema, type PlatformStatus } from '@ai-hot/shared'

const COMPANION_SERVICE_ORIGIN = 'http://127.0.0.1:4317'

type PlatformStatusesPayload = {
  success: boolean
  data: PlatformStatus[] | null
  error: string | null
}

export const fetchPlatformStatuses = async (
  fetchImplementation: typeof fetch = fetch
): Promise<PlatformStatus[]> => {
  const response = await fetchImplementation(`${COMPANION_SERVICE_ORIGIN}${API_ROUTES.platformStatuses}`)

  if (!response.ok) {
    throw new Error('platform status request failed')
  }

  const payload = (await response.json()) as PlatformStatusesPayload

  if (!payload.success || !payload.data) {
    throw new Error(payload.error ?? 'platform status request failed')
  }

  return payload.data.map((status) => platformStatusSchema.parse(status))
}
```

```tsx
// apps/chrome-extension/src/options/App.tsx
const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([])

useEffect(() => {
  let isActive = true

  const loadPage = async () => {
    try {
      const [settingsResponse, platformStatusesResponse] = await Promise.all([
        fetch(SETTINGS_URL),
        fetchPlatformStatuses()
      ])
      const settingsPayload = await readSettingsPayload(settingsResponse)

      if (!settingsResponse.ok || !settingsPayload.success || !settingsPayload.data) {
        throw new Error(settingsPayload.error ?? 'settings request failed')
      }

      if (!isActive) {
        return
      }

      setSettings(settingsSchema.parse(settingsPayload.data))
      setPlatformStatuses(platformStatusesResponse)
      setErrorMessage(null)
      setHasLoaded(true)
    } catch {
      if (!isActive) {
        return
      }

      setErrorMessage('暂时无法加载设置。')
    }
  }

  void loadPage()

  return () => {
    isActive = false
  }
}, [])

<ul>
  {platformStatuses.map((status) => (
    <li key={status.platform}>
      {status.platform}: {status.detail ?? '可用'}
    </li>
  ))}
</ul>
```

- [ ] **Step 4: Run the frontend tests again**

Run: `pnpm test -- tests/chrome-extension/newtab-status.test.tsx tests/chrome-extension/options-page.test.tsx`
Expected: PASS with the new UI copy visible in both screens.

- [ ] **Step 5: Record the checkpoint**

Run: `pnpm test -- tests/chrome-extension/newtab-status.test.tsx tests/chrome-extension/options-page.test.tsx tests/companion-service/feed-routes.test.ts`
Expected: PASS before final verification.

## Task 11: Run end-to-end verification of the browser-profile ingestion slice

**Files:**
- Modify: `scripts/run-daily-update.ts` (only if wiring changes require the new repository dependency)
- Verify: live companion service and extension behavior

- [ ] **Step 1: Add the failing verification note to the task log**

Record the expected failures before implementation:

```txt
- X / Twitter bucket always empty because collectTodayFeed returns []
- YouTube bucket always empty because collectTodayFeed returns []
- Xiaohongshu bucket always empty because collectTodayFeed returns []
- Settings page has no runtime status panel
```

- [ ] **Step 2: Run the full automated suite after implementation**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS with all updated backend and frontend tests green.

- [ ] **Step 3: Run the real daily update path**

Run: `pnpm run:daily-update`
Expected: PASS with feed persistence succeeding and platform statuses written without crashing the existing GitHub / Hugging Face pipeline.

- [ ] **Step 4: Start the live app and verify the real UI**

Run:

```bash
COMPANION_SERVICE_PORT=4317 pnpm start:companion-service
pnpm dev:chrome-extension
```

Expected:
- `http://127.0.0.1:4317/api/status` returns 200
- `http://127.0.0.1:4317/api/status/platforms` returns platform statuses
- `http://127.0.0.1:4173/newtab/` shows platform-specific messages or cards
- `http://127.0.0.1:4173/options/` shows the runtime status panel

- [ ] **Step 5: Record the final verification checkpoint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS after the live run, confirming no verification-only edits were needed.

## Self-Review Checklist

### Spec coverage
- Shared contracts and route additions are covered in Task 1 and Task 9.
- Chrome profile discovery is covered in Task 3.
- Browser session and login-state detection are covered in Task 4.
- Xiaohongshu / X / YouTube adapters are covered in Tasks 5, 6, and 7.
- `collectTodayFeed` integration and scheduler persistence are covered in Task 8.
- New-tab and settings-page state upgrades are covered in Task 10.
- Verification of the full runtime path is covered in Task 11.

### Placeholder scan
- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each task includes exact files, failing tests, concrete code, and exact commands.

### Type consistency
- Shared route names (`API_ROUTES.platformStatuses`) are introduced in Task 1 and used consistently in Task 9 and Task 10.
- Shared types (`PlatformStatus`, `TodayFeed`, `FeedBucket`) are introduced in Task 1 and used consistently in later tasks.
- `replacePlatformStatuses` is introduced in Task 8 and then consumed by Task 9 server wiring.
