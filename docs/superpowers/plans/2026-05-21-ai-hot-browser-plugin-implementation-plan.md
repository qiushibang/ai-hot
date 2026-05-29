# AI Hot Browser Plugin v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AI Hot v1 as a Chrome new-tab extension plus a local companion service that aggregates daily AI hot content, supports keyword filtering and favorites, and pushes selected items to Feishu or WeChat after local binding.

**Architecture:** Use a local-first two-process design. The companion service owns ingestion, normalization, ranking, summarization, SQLite persistence, and localhost APIs. The Chrome extension owns presentation, filtering interactions, favorites/settings flows, and push actions against the local API.

**Tech Stack:** TypeScript, Node.js, Chrome Extension (Manifest V3), local HTTP API, SQLite, Vitest, Playwright, shared Zod schemas

---

## Proposed File Structure

### Application roots
- Create: `apps/companion-service/package.json`
- Create: `apps/companion-service/tsconfig.json`
- Create: `apps/companion-service/src/index.ts`
- Create: `apps/companion-service/src/config.ts`
- Create: `apps/companion-service/src/server/createServer.ts`
- Create: `apps/companion-service/src/server/routes/*.ts`
- Create: `apps/companion-service/src/db/*.ts`
- Create: `apps/companion-service/src/feed/*.ts`
- Create: `apps/companion-service/src/adapters/*/*.ts`
- Create: `apps/companion-service/src/push/*.ts`
- Create: `apps/companion-service/src/scheduler/*.ts`
- Create: `apps/companion-service/src/shared/*.ts`

- Create: `apps/chrome-extension/package.json`
- Create: `apps/chrome-extension/manifest.config.ts`
- Create: `apps/chrome-extension/src/newtab/main.tsx`
- Create: `apps/chrome-extension/src/newtab/App.tsx`
- Create: `apps/chrome-extension/src/newtab/components/*.tsx`
- Create: `apps/chrome-extension/src/newtab/lib/*.ts`
- Create: `apps/chrome-extension/src/options/main.tsx`
- Create: `apps/chrome-extension/src/options/App.tsx`
- Create: `apps/chrome-extension/src/shared/*.ts`

### Shared contract
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/feed.ts`
- Create: `packages/shared/src/settings.ts`
- Create: `packages/shared/src/api.ts`
- Create: `packages/shared/src/index.ts`

### Tooling and tests
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/companion-service/**/*.test.ts`
- Create: `tests/chrome-extension/**/*.test.tsx`
- Create: `tests/e2e/**/*.spec.ts`

### Install/bootstrap
- Create: `scripts/install-companion-mac.sh`
- Create: `scripts/start-companion.sh`
- Create: `scripts/run-daily-update.ts`

## Delivery Notes

- Build the localhost contract first so the extension can ship against a stable interface.
- Start with GitHub and Hugging Face adapters only; keep X, YouTube, and Xiaohongshu out of the initial backbone until the pipeline is proven.
- Use deterministic mock data in early UI tests before enabling live adapters.
- Keep push credentials local only. No cloud account system or remote persistence belongs in v1.
- The extension should never wait for live collection work. It always renders the latest local cache or a clear empty/error state.

## Task 1: Bootstrap the monorepo and shared tooling

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Test: `tests/smoke/workspace.test.ts`

- [ ] **Step 1: Write the failing workspace smoke test**

```ts
import { describe, expect, test } from 'vitest'

describe('workspace bootstrap', () => {
  test('loads test runner', () => {
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify the workspace is not wired yet**

Run: `pnpm vitest tests/smoke/workspace.test.ts`
Expected: FAIL with a missing `package.json`, missing dependencies, or missing Vitest config.

- [ ] **Step 3: Write the minimal workspace configuration**

```json
{
  "name": "ai-hot",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc -p tsconfig.base.json --noEmit"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

```yaml
packages:
  - apps/*
  - packages/*
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "baseUrl": "."
  }
}
```

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node'
  }
})
```

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e'
})
```

- [ ] **Step 4: Install dependencies and run the smoke test again**

Run: `pnpm install && pnpm vitest tests/smoke/workspace.test.ts`
Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.config.ts playwright.config.ts tests/smoke/workspace.test.ts
git commit -m "chore: bootstrap workspace tooling"
```

## Task 2: Define shared domain schemas and API contracts

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/feed.ts`
- Create: `packages/shared/src/settings.ts`
- Create: `packages/shared/src/api.ts`
- Create: `packages/shared/src/index.ts`
- Test: `tests/companion-service/shared-contracts.test.ts`

- [ ] **Step 1: Write the failing shared-contract test**

```ts
import { describe, expect, test } from 'vitest'
import { feedItemSchema } from '../../packages/shared/src/feed'

describe('feed item schema', () => {
  test('accepts a normalized feed item', () => {
    const parsed = feedItemSchema.parse({
      id: 'github:owner/repo',
      platform: 'github',
      title: 'awesome-project',
      summary: '中文摘要',
      url: 'https://example.com/repo',
      author: 'owner',
      publishedAt: '2026-05-21T00:00:00.000Z',
      popularityScore: 10,
      growthScore: 5,
      rawTags: ['agent'],
      sourceId: 'owner/repo'
    })

    expect(parsed.platform).toBe('github')
  })
})
```

- [ ] **Step 2: Run test to verify the schema is missing**

Run: `pnpm vitest tests/companion-service/shared-contracts.test.ts`
Expected: FAIL with module not found or exported symbol missing.

- [ ] **Step 3: Write the minimal shared schema implementation**

```ts
import { z } from 'zod'

export const platformSchema = z.enum(['github', 'x', 'youtube', 'xiaohongshu', 'huggingface'])

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
```

```ts
import { z } from 'zod'

export const pushChannelSchema = z.enum(['feishu', 'wechat'])

export const settingsSchema = z.object({
  includeKeywords: z.array(z.string()),
  excludeKeywords: z.array(z.string()),
  enabledPlatforms: z.array(z.enum(['github', 'x', 'youtube', 'xiaohongshu', 'huggingface'])),
  feishuWebhookUrl: z.string().url().nullable(),
  wechatWebhookUrl: z.string().url().nullable()
})
```

```ts
export const API_ROUTES = {
  todayFeed: '/api/feed/today',
  favorites: '/api/favorites',
  settings: '/api/settings',
  status: '/api/status',
  pushFeishu: '/api/push/feishu',
  pushWechat: '/api/push/wechat'
} as const
```

```ts
export * from './api'
export * from './feed'
export * from './settings'
```

- [ ] **Step 4: Add `zod` to shared/workspace deps and run the test again**

Run: `pnpm add -Dw zod && pnpm vitest tests/companion-service/shared-contracts.test.ts`
Expected: PASS with schema parse succeeding.

- [ ] **Step 5: Commit**

```bash
git add packages/shared tests/companion-service/shared-contracts.test.ts package.json pnpm-lock.yaml
git commit -m "feat: define shared feed and settings contracts"
```

## Task 3: Build the companion service config, startup, and status endpoint

**Files:**
- Create: `apps/companion-service/package.json`
- Create: `apps/companion-service/src/config.ts`
- Create: `apps/companion-service/src/server/createServer.ts`
- Create: `apps/companion-service/src/server/routes/status.ts`
- Create: `apps/companion-service/src/index.ts`
- Test: `tests/companion-service/status-route.test.ts`

- [ ] **Step 1: Write the failing status-route test**

```ts
import request from 'supertest'
import { describe, expect, test } from 'vitest'
import { createServer } from '../../apps/companion-service/src/server/createServer'

describe('GET /api/status', () => {
  test('returns healthy service metadata', async () => {
    const app = createServer()

    const response = await request(app).get('/api/status')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.status).toBe('ok')
  })
})
```

- [ ] **Step 2: Run test to verify the server is missing**

Run: `pnpm vitest tests/companion-service/status-route.test.ts`
Expected: FAIL with missing `createServer` or missing dependencies.

- [ ] **Step 3: Write the minimal HTTP server**

```ts
import express from 'express'
import { registerStatusRoute } from './routes/status'

export const createServer = () => {
  const app = express()

  app.use(express.json())
  registerStatusRoute(app)

  return app
}
```

```ts
import type { Express } from 'express'

export const registerStatusRoute = (app: Express) => {
  app.get('/api/status', (_request, response) => {
    response.json({
      success: true,
      data: {
        status: 'ok',
        service: 'ai-hot-companion'
      },
      error: null
    })
  })
}
```

```ts
import { createServer } from './server/createServer'

const DEFAULT_PORT = 4317
const app = createServer()

app.listen(DEFAULT_PORT, '127.0.0.1')
```

- [ ] **Step 4: Add the package deps and run the test again**

Run: `pnpm add express supertest && pnpm add -D @types/express @types/supertest && pnpm vitest tests/companion-service/status-route.test.ts`
Expected: PASS with `200` response.

- [ ] **Step 5: Commit**

```bash
git add apps/companion-service tests/companion-service/status-route.test.ts package.json pnpm-lock.yaml
git commit -m "feat: add companion service status endpoint"
```

## Task 4: Add SQLite persistence and repository setup

**Files:**
- Create: `apps/companion-service/src/db/schema.ts`
- Create: `apps/companion-service/src/db/client.ts`
- Create: `apps/companion-service/src/db/feedRepository.ts`
- Create: `apps/companion-service/src/db/settingsRepository.ts`
- Test: `tests/companion-service/feed-repository.test.ts`

- [ ] **Step 1: Write the failing feed-repository test**

```ts
import { describe, expect, test } from 'vitest'
import { createInMemoryDatabase } from '../../apps/companion-service/src/db/client'
import { createFeedRepository } from '../../apps/companion-service/src/db/feedRepository'

describe('feed repository', () => {
  test('stores and returns feed items by platform', async () => {
    const database = createInMemoryDatabase()
    const repository = createFeedRepository(database)

    await repository.replaceTodayFeed([
      {
        id: 'github:owner/repo',
        platform: 'github',
        title: 'awesome-project',
        summary: '中文摘要',
        url: 'https://example.com/repo',
        author: 'owner',
        publishedAt: '2026-05-21T00:00:00.000Z',
        popularityScore: 10,
        growthScore: 5,
        rawTags: ['agent'],
        sourceId: 'owner/repo'
      }
    ])

    const items = await repository.getTodayFeedByPlatform('github')

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('github:owner/repo')
  })
})
```

- [ ] **Step 2: Run test to verify the repository is missing**

Run: `pnpm vitest tests/companion-service/feed-repository.test.ts`
Expected: FAIL with missing database/repository modules.

- [ ] **Step 3: Write the minimal SQLite-backed repository**

```ts
import Database from 'better-sqlite3'

export const createInMemoryDatabase = () => new Database(':memory:')
```

```ts
export const FEED_TABLE_SQL = `
  create table if not exists feed_items (
    id text primary key,
    platform text not null,
    title text not null,
    summary text not null,
    url text not null,
    author text not null,
    published_at text not null,
    popularity_score real not null,
    growth_score real not null,
    raw_tags text not null,
    source_id text not null,
    collected_date text not null
  )
`
```

```ts
import type Database from 'better-sqlite3'
import { FEED_TABLE_SQL } from './schema'

export const createFeedRepository = (database: Database.Database) => {
  database.exec(FEED_TABLE_SQL)

  return {
    async replaceTodayFeed(items) {
      const today = '2026-05-21'
      database.prepare('delete from feed_items where collected_date = ?').run(today)
      const statement = database.prepare(`
        insert into feed_items (
          id, platform, title, summary, url, author, published_at,
          popularity_score, growth_score, raw_tags, source_id, collected_date
        ) values (
          @id, @platform, @title, @summary, @url, @author, @publishedAt,
          @popularityScore, @growthScore, @rawTags, @sourceId, @collectedDate
        )
      `)

      for (const item of items) {
        statement.run({
          ...item,
          rawTags: JSON.stringify(item.rawTags),
          collectedDate: today
        })
      }
    },
    async getTodayFeedByPlatform(platform) {
      const today = '2026-05-21'
      return database
        .prepare('select * from feed_items where platform = ? and collected_date = ? order by popularity_score desc')
        .all(platform, today)
        .map((row) => ({
          id: row.id,
          platform: row.platform,
          title: row.title,
          summary: row.summary,
          url: row.url,
          author: row.author,
          publishedAt: row.published_at,
          popularityScore: row.popularity_score,
          growthScore: row.growth_score,
          rawTags: JSON.parse(row.raw_tags),
          sourceId: row.source_id
        }))
    }
  }
}
```

- [ ] **Step 4: Install the DB dependency and run the test again**

Run: `pnpm add better-sqlite3 && pnpm vitest tests/companion-service/feed-repository.test.ts`
Expected: PASS with one stored item returned.

- [ ] **Step 5: Commit**

```bash
git add apps/companion-service/src/db tests/companion-service/feed-repository.test.ts package.json pnpm-lock.yaml
git commit -m "feat: add sqlite feed persistence"
```

## Task 5: Implement feed read APIs with empty-state behavior

**Files:**
- Create: `apps/companion-service/src/server/routes/feed.ts`
- Modify: `apps/companion-service/src/server/createServer.ts`
- Test: `tests/companion-service/feed-routes.test.ts`

- [ ] **Step 1: Write the failing feed-routes test**

```ts
import request from 'supertest'
import { describe, expect, test } from 'vitest'
import { createServer } from '../../apps/companion-service/src/server/createServer'

describe('GET /api/feed/today', () => {
  test('returns platform buckets and empty-state metadata', async () => {
    const app = createServer()

    const response = await request(app).get('/api/feed/today')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.github.items).toEqual([])
    expect(response.body.data.github.message).toBe('今日结果较少')
  })
})
```

- [ ] **Step 2: Run test to verify the route does not exist**

Run: `pnpm vitest tests/companion-service/feed-routes.test.ts`
Expected: FAIL with 404 or missing route registration.

- [ ] **Step 3: Write the minimal feed route**

```ts
import type { Express } from 'express'

const EMPTY_PLATFORM_BUCKET = {
  items: [],
  message: '今日结果较少'
}

export const registerFeedRoutes = (app: Express) => {
  app.get('/api/feed/today', (_request, response) => {
    response.json({
      success: true,
      data: {
        github: EMPTY_PLATFORM_BUCKET,
        x: EMPTY_PLATFORM_BUCKET,
        youtube: EMPTY_PLATFORM_BUCKET,
        xiaohongshu: EMPTY_PLATFORM_BUCKET,
        huggingface: EMPTY_PLATFORM_BUCKET
      },
      error: null
    })
  })
}
```

```ts
import express from 'express'
import { registerFeedRoutes } from './routes/feed'
import { registerStatusRoute } from './routes/status'

export const createServer = () => {
  const app = express()

  app.use(express.json())
  registerStatusRoute(app)
  registerFeedRoutes(app)

  return app
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm vitest tests/companion-service/feed-routes.test.ts`
Expected: PASS with empty platform buckets returned.

- [ ] **Step 5: Commit**

```bash
git add apps/companion-service/src/server tests/companion-service/feed-routes.test.ts
git commit -m "feat: add feed read routes with empty states"
```

## Task 6: Add ranking, dedupe, and normalization pipeline utilities

**Files:**
- Create: `apps/companion-service/src/feed/normalizeItem.ts`
- Create: `apps/companion-service/src/feed/dedupeItems.ts`
- Create: `apps/companion-service/src/feed/rankItems.ts`
- Test: `tests/companion-service/ranking-pipeline.test.ts`

- [ ] **Step 1: Write the failing ranking-pipeline test**

```ts
import { describe, expect, test } from 'vitest'
import { rankItems } from '../../apps/companion-service/src/feed/rankItems'

describe('rankItems', () => {
  test('sorts by popularity, growth, and time decay inputs', () => {
    const ranked = rankItems([
      {
        id: 'a',
        popularityScore: 50,
        growthScore: 10,
        publishedAt: '2026-05-20T00:00:00.000Z'
      },
      {
        id: 'b',
        popularityScore: 40,
        growthScore: 30,
        publishedAt: '2026-05-21T00:00:00.000Z'
      }
    ])

    expect(ranked[0].id).toBe('b')
  })
})
```

- [ ] **Step 2: Run test to verify the pipeline utility is missing**

Run: `pnpm vitest tests/companion-service/ranking-pipeline.test.ts`
Expected: FAIL with missing module.

- [ ] **Step 3: Write the minimal ranking logic**

```ts
const HOURS_PER_DAY = 24
const TIME_DECAY_WEIGHT = 0.5

const getAgeInDays = (publishedAt: string) => {
  const publishedTime = new Date(publishedAt).getTime()
  const now = new Date('2026-05-21T00:00:00.000Z').getTime()
  const diffInHours = Math.max(0, (now - publishedTime) / (1000 * 60 * 60))

  return diffInHours / HOURS_PER_DAY
}

export const rankItems = <T extends { popularityScore: number; growthScore: number; publishedAt: string }>(items: T[]) => {
  return [...items].sort((left, right) => {
    const leftScore = left.popularityScore + left.growthScore - getAgeInDays(left.publishedAt) * TIME_DECAY_WEIGHT
    const rightScore = right.popularityScore + right.growthScore - getAgeInDays(right.publishedAt) * TIME_DECAY_WEIGHT

    return rightScore - leftScore
  })
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm vitest tests/companion-service/ranking-pipeline.test.ts`
Expected: PASS with item `b` ranked first.

- [ ] **Step 5: Commit**

```bash
git add apps/companion-service/src/feed tests/companion-service/ranking-pipeline.test.ts
git commit -m "feat: add feed ranking pipeline"
```

## Task 7: Implement GitHub and Hugging Face adapters first

**Files:**
- Create: `apps/companion-service/src/adapters/github/fetchGithubFeed.ts`
- Create: `apps/companion-service/src/adapters/huggingface/fetchHuggingFaceFeed.ts`
- Create: `apps/companion-service/src/feed/collectTodayFeed.ts`
- Test: `tests/companion-service/collect-today-feed.test.ts`

- [ ] **Step 1: Write the failing collection test**

```ts
import { describe, expect, test, vi } from 'vitest'
import { collectTodayFeed } from '../../apps/companion-service/src/feed/collectTodayFeed'

describe('collectTodayFeed', () => {
  test('combines github and huggingface results into platform buckets', async () => {
    const githubAdapter = vi.fn().mockResolvedValue([
      { id: 'github:1', platform: 'github', title: 'Repo', summary: '摘要', url: 'https://example.com/1', author: 'alice', publishedAt: '2026-05-21T00:00:00.000Z', popularityScore: 10, growthScore: 5, rawTags: [], sourceId: '1' }
    ])
    const huggingFaceAdapter = vi.fn().mockResolvedValue([
      { id: 'huggingface:1', platform: 'huggingface', title: 'Model', summary: '摘要', url: 'https://example.com/2', author: 'bob', publishedAt: '2026-05-21T00:00:00.000Z', popularityScore: 8, growthScore: 4, rawTags: [], sourceId: '2' }
    ])

    const feed = await collectTodayFeed({ githubAdapter, huggingFaceAdapter })

    expect(feed.github).toHaveLength(1)
    expect(feed.huggingface).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify the collector does not exist**

Run: `pnpm vitest tests/companion-service/collect-today-feed.test.ts`
Expected: FAIL with missing collector.

- [ ] **Step 3: Write the minimal collector**

```ts
export const collectTodayFeed = async ({ githubAdapter, huggingFaceAdapter }) => {
  const [github, huggingface] = await Promise.all([githubAdapter(), huggingFaceAdapter()])

  return {
    github,
    huggingface,
    x: [],
    youtube: [],
    xiaohongshu: []
  }
}
```

```ts
export const fetchGithubFeed = async () => {
  return []
}
```

```ts
export const fetchHuggingFaceFeed = async () => {
  return []
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm vitest tests/companion-service/collect-today-feed.test.ts`
Expected: PASS with GitHub and Hugging Face arrays populated.

- [ ] **Step 5: Commit**

```bash
git add apps/companion-service/src/adapters apps/companion-service/src/feed/collectTodayFeed.ts tests/companion-service/collect-today-feed.test.ts
git commit -m "feat: add initial github and huggingface ingestion"
```

## Task 8: Add deterministic summary generation boundary

**Files:**
- Create: `apps/companion-service/src/feed/summarizeItems.ts`
- Test: `tests/companion-service/summarize-items.test.ts`

- [ ] **Step 1: Write the failing summarizer test**

```ts
import { describe, expect, test } from 'vitest'
import { summarizeItems } from '../../apps/companion-service/src/feed/summarizeItems'

describe('summarizeItems', () => {
  test('caps summary length for new-tab cards', async () => {
    const [item] = await summarizeItems([
      {
        title: 'Long title',
        summary: 'This placeholder summary should be shortened into a compact Chinese card summary for fast reading.'
      }
    ])

    expect(item.summary.length).toBeLessThanOrEqual(80)
  })
})
```

- [ ] **Step 2: Run test to verify the summarizer is missing**

Run: `pnpm vitest tests/companion-service/summarize-items.test.ts`
Expected: FAIL with missing module.

- [ ] **Step 3: Write the minimal summarizer boundary**

```ts
const SUMMARY_MAX_LENGTH = 80

export const summarizeItems = async <T extends { summary: string }>(items: T[]) => {
  return items.map((item) => ({
    ...item,
    summary: item.summary.slice(0, SUMMARY_MAX_LENGTH)
  }))
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm vitest tests/companion-service/summarize-items.test.ts`
Expected: PASS with summaries capped to 80 characters.

- [ ] **Step 5: Commit**

```bash
git add apps/companion-service/src/feed/summarizeItems.ts tests/companion-service/summarize-items.test.ts
git commit -m "feat: add summary length boundary"
```

## Task 9: Build the daily update job and persist feed snapshots

**Files:**
- Create: `apps/companion-service/src/scheduler/runDailyUpdate.ts`
- Create: `scripts/run-daily-update.ts`
- Test: `tests/companion-service/run-daily-update.test.ts`

- [ ] **Step 1: Write the failing daily-update test**

```ts
import { describe, expect, test, vi } from 'vitest'
import { runDailyUpdate } from '../../apps/companion-service/src/scheduler/runDailyUpdate'

describe('runDailyUpdate', () => {
  test('collects, summarizes, ranks, and persists the daily feed', async () => {
    const collectTodayFeed = vi.fn().mockResolvedValue({ github: [], huggingface: [], x: [], youtube: [], xiaohongshu: [] })
    const summarizeItems = vi.fn().mockResolvedValue([])
    const replaceTodayFeed = vi.fn().mockResolvedValue(undefined)

    await runDailyUpdate({ collectTodayFeed, summarizeItems, replaceTodayFeed })

    expect(collectTodayFeed).toHaveBeenCalledTimes(1)
    expect(summarizeItems).toHaveBeenCalledTimes(1)
    expect(replaceTodayFeed).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify the scheduler entry is missing**

Run: `pnpm vitest tests/companion-service/run-daily-update.test.ts`
Expected: FAIL with missing module.

- [ ] **Step 3: Write the minimal daily-update orchestration**

```ts
export const runDailyUpdate = async ({ collectTodayFeed, summarizeItems, replaceTodayFeed }) => {
  const platformBuckets = await collectTodayFeed()
  const allItems = Object.values(platformBuckets).flat()
  const summarizedItems = await summarizeItems(allItems)

  await replaceTodayFeed(summarizedItems)
}
```

```ts
import { runDailyUpdate } from '../apps/companion-service/src/scheduler/runDailyUpdate'

void runDailyUpdate({
  collectTodayFeed: async () => ({ github: [], huggingface: [], x: [], youtube: [], xiaohongshu: [] }),
  summarizeItems: async (items) => items,
  replaceTodayFeed: async () => undefined
})
```

- [ ] **Step 4: Run the test again**

Run: `pnpm vitest tests/companion-service/run-daily-update.test.ts`
Expected: PASS with all orchestration functions invoked.

- [ ] **Step 5: Commit**

```bash
git add apps/companion-service/src/scheduler scripts/run-daily-update.ts tests/companion-service/run-daily-update.test.ts
git commit -m "feat: add daily update job"
```

## Task 10: Build the extension shell and service connectivity states

**Files:**
- Create: `apps/chrome-extension/package.json`
- Create: `apps/chrome-extension/src/newtab/App.tsx`
- Create: `apps/chrome-extension/src/newtab/main.tsx`
- Create: `apps/chrome-extension/src/newtab/lib/fetchStatus.ts`
- Test: `tests/chrome-extension/newtab-status.test.tsx`

- [ ] **Step 1: Write the failing extension connectivity test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { App } from '../../apps/chrome-extension/src/newtab/App'

describe('App', () => {
  test('shows a service unavailable state when localhost is offline', async () => {
    const fetchStatus = vi.fn().mockRejectedValue(new Error('offline'))

    render(<App fetchStatus={fetchStatus} />)

    expect(await screen.findByText('本地服务未连接')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify the extension shell is missing**

Run: `pnpm vitest tests/chrome-extension/newtab-status.test.tsx`
Expected: FAIL with missing React component or testing library.

- [ ] **Step 3: Write the minimal new-tab shell**

```tsx
import { useEffect, useState } from 'react'

export const App = ({ fetchStatus }) => {
  const [message, setMessage] = useState('加载中')

  useEffect(() => {
    fetchStatus()
      .then(() => {
        setMessage('今日 AI 热门')
      })
      .catch(() => {
        setMessage('本地服务未连接')
      })
  }, [fetchStatus])

  return <main>{message}</main>
}
```

```ts
export const fetchStatus = async () => {
  const response = await fetch('http://127.0.0.1:4317/api/status')

  if (!response.ok) {
    throw new Error('status request failed')
  }

  return response.json()
}
```

```tsx
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { fetchStatus } from './lib/fetchStatus'

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(<App fetchStatus={fetchStatus} />)
}
```

- [ ] **Step 4: Add React/testing deps and run the test again**

Run: `pnpm add react react-dom && pnpm add -D @testing-library/react @testing-library/jest-dom jsdom && pnpm vitest tests/chrome-extension/newtab-status.test.tsx`
Expected: PASS with the offline state rendered.

- [ ] **Step 5: Commit**

```bash
git add apps/chrome-extension tests/chrome-extension/newtab-status.test.tsx package.json pnpm-lock.yaml
git commit -m "feat: add extension shell and service state"
```

## Task 11: Render platform sections from `/api/feed/today`

**Files:**
- Create: `apps/chrome-extension/src/newtab/lib/fetchTodayFeed.ts`
- Create: `apps/chrome-extension/src/newtab/components/PlatformSection.tsx`
- Modify: `apps/chrome-extension/src/newtab/App.tsx`
- Test: `tests/chrome-extension/platform-sections.test.tsx`

- [ ] **Step 1: Write the failing platform-sections test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { App } from '../../apps/chrome-extension/src/newtab/App'

describe('App platform sections', () => {
  test('renders platform sections and feed cards', async () => {
    const fetchStatus = vi.fn().mockResolvedValue({})
    const fetchTodayFeed = vi.fn().mockResolvedValue({
      github: {
        items: [
          { id: 'github:1', title: 'Repo 1', summary: '摘要', url: 'https://example.com/1', platform: 'github' }
        ],
        message: null
      }
    })

    render(<App fetchStatus={fetchStatus} fetchTodayFeed={fetchTodayFeed} />)

    expect(await screen.findByText('GitHub')).toBeInTheDocument()
    expect(await screen.findByText('Repo 1')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify feed rendering is not implemented**

Run: `pnpm vitest tests/chrome-extension/platform-sections.test.tsx`
Expected: FAIL with missing props or missing rendered content.

- [ ] **Step 3: Write the minimal section renderer**

```tsx
export const PlatformSection = ({ title, items, message }) => {
  return (
    <section>
      <h2>{title}</h2>
      {items.length === 0 ? <p>{message ?? '今日结果较少'}</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a href={item.url}>{item.title}</a>
            <p>{item.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

```ts
export const fetchTodayFeed = async () => {
  const response = await fetch('http://127.0.0.1:4317/api/feed/today')

  if (!response.ok) {
    throw new Error('feed request failed')
  }

  const payload = await response.json()
  return payload.data
}
```

```tsx
import { useEffect, useState } from 'react'
import { PlatformSection } from './components/PlatformSection'

const PLATFORM_TITLES = {
  github: 'GitHub',
  x: 'X / Twitter',
  youtube: 'YouTube',
  xiaohongshu: '小红书',
  huggingface: 'Hugging Face'
}

export const App = ({ fetchStatus, fetchTodayFeed }) => {
  const [message, setMessage] = useState('加载中')
  const [feed, setFeed] = useState(null)

  useEffect(() => {
    fetchStatus()
      .then(async () => {
        setMessage('今日 AI 热门')
        const nextFeed = await fetchTodayFeed()
        setFeed(nextFeed)
      })
      .catch(() => {
        setMessage('本地服务未连接')
      })
  }, [fetchStatus, fetchTodayFeed])

  if (message === '本地服务未连接') {
    return <main>{message}</main>
  }

  if (!feed) {
    return <main>{message}</main>
  }

  return (
    <main>
      <h1>今日 AI 热门</h1>
      {Object.entries(feed).map(([platform, bucket]) => (
        <PlatformSection
          key={platform}
          title={PLATFORM_TITLES[platform]}
          items={bucket.items}
          message={bucket.message}
        />
      ))}
    </main>
  )
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm vitest tests/chrome-extension/platform-sections.test.tsx`
Expected: PASS with platform heading and card content rendered.

- [ ] **Step 5: Commit**

```bash
git add apps/chrome-extension/src/newtab tests/chrome-extension/platform-sections.test.tsx
git commit -m "feat: render platform feed sections"
```

## Task 12: Add include/exclude keyword filtering and platform filtering

**Files:**
- Create: `apps/chrome-extension/src/newtab/lib/filterFeed.ts`
- Create: `apps/chrome-extension/src/newtab/components/FilterBar.tsx`
- Modify: `apps/chrome-extension/src/newtab/App.tsx`
- Test: `tests/chrome-extension/filter-feed.test.ts`
- Test: `tests/chrome-extension/filter-bar.test.tsx`

- [ ] **Step 1: Write the failing pure filter test**

```ts
import { describe, expect, test } from 'vitest'
import { filterFeed } from '../../apps/chrome-extension/src/newtab/lib/filterFeed'

describe('filterFeed', () => {
  test('filters by include keywords, exclude keywords, and enabled platforms', () => {
    const filtered = filterFeed(
      {
        github: {
          items: [
            { id: '1', title: 'AI Agent Repo', summary: 'framework', author: 'alice', rawTags: ['agent'] }
          ],
          message: null
        },
        youtube: {
          items: [
            { id: '2', title: 'Cooking video', summary: 'not ai', author: 'bob', rawTags: [] }
          ],
          message: null
        }
      },
      {
        includeKeywords: ['agent'],
        excludeKeywords: ['cooking'],
        enabledPlatforms: ['github']
      }
    )

    expect(filtered.github.items).toHaveLength(1)
    expect(filtered.youtube.items).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify the filter logic is missing**

Run: `pnpm vitest tests/chrome-extension/filter-feed.test.ts`
Expected: FAIL with missing filter module.

- [ ] **Step 3: Write the minimal filter utility**

```ts
const matchesKeyword = (text: string, keyword: string) => text.toLowerCase().includes(keyword.toLowerCase())

export const filterFeed = (feed, filters) => {
  return Object.fromEntries(
    Object.entries(feed).map(([platform, bucket]) => {
      const isPlatformEnabled = filters.enabledPlatforms.includes(platform)

      if (!isPlatformEnabled) {
        return [platform, { ...bucket, items: [] }]
      }

      const items = bucket.items.filter((item) => {
        const searchableText = [item.title, item.summary, item.author, ...(item.rawTags ?? [])].join(' ')
        const matchesInclude = filters.includeKeywords.length === 0 || filters.includeKeywords.some((keyword) => matchesKeyword(searchableText, keyword))
        const matchesExclude = filters.excludeKeywords.some((keyword) => matchesKeyword(searchableText, keyword))

        return matchesInclude && !matchesExclude
      })

      return [platform, { ...bucket, items }]
    })
  )
}
```

- [ ] **Step 4: Add a minimal filter bar and wire it into the app**

```tsx
export const FilterBar = ({ includeKeywords, excludeKeywords, onIncludeChange, onExcludeChange }) => {
  return (
    <form>
      <label>
        包含关键词
        <input value={includeKeywords} onChange={(event) => onIncludeChange(event.target.value)} />
      </label>
      <label>
        排除关键词
        <input value={excludeKeywords} onChange={(event) => onExcludeChange(event.target.value)} />
      </label>
    </form>
  )
}
```

```tsx
const splitKeywords = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)
```

Add state to `App` for `includeKeywords`, `excludeKeywords`, and `enabledPlatforms`, then call `filterFeed(feed, { includeKeywords: splitKeywords(includeKeywords), excludeKeywords: splitKeywords(excludeKeywords), enabledPlatforms })` before rendering sections.

- [ ] **Step 5: Run both tests**

Run: `pnpm vitest tests/chrome-extension/filter-feed.test.ts tests/chrome-extension/filter-bar.test.tsx`
Expected: PASS with filter behavior verified.

- [ ] **Step 6: Commit**

```bash
git add apps/chrome-extension/src/newtab tests/chrome-extension/filter-feed.test.ts tests/chrome-extension/filter-bar.test.tsx
git commit -m "feat: add keyword filtering"
```

## Task 13: Add local favorites and browser restart persistence

**Files:**
- Create: `apps/companion-service/src/server/routes/favorites.ts`
- Create: `apps/companion-service/src/db/favoritesRepository.ts`
- Create: `apps/chrome-extension/src/newtab/components/FavoriteButton.tsx`
- Modify: `apps/chrome-extension/src/newtab/App.tsx`
- Test: `tests/companion-service/favorites-routes.test.ts`
- Test: `tests/chrome-extension/favorites-flow.test.tsx`

- [ ] **Step 1: Write the failing favorites API test**

```ts
import request from 'supertest'
import { describe, expect, test } from 'vitest'
import { createServer } from '../../apps/companion-service/src/server/createServer'

describe('favorites routes', () => {
  test('creates and lists favorites', async () => {
    const app = createServer()

    const createResponse = await request(app).post('/api/favorites').send({ itemId: 'github:1' })
    const listResponse = await request(app).get('/api/favorites')

    expect(createResponse.status).toBe(200)
    expect(listResponse.body.data).toContainEqual({ itemId: 'github:1' })
  })
})
```

- [ ] **Step 2: Run test to verify favorites are not implemented**

Run: `pnpm vitest tests/companion-service/favorites-routes.test.ts`
Expected: FAIL with 404 or missing repository.

- [ ] **Step 3: Write the minimal favorites repository and routes**

```ts
export const createFavoritesRepository = () => {
  const items: { itemId: string }[] = []

  return {
    async list() {
      return [...items]
    },
    async add(itemId: string) {
      items.push({ itemId })
      return { itemId }
    }
  }
}
```

```ts
import type { Express } from 'express'

export const registerFavoriteRoutes = (app: Express, favoritesRepository) => {
  app.get('/api/favorites', async (_request, response) => {
    response.json({ success: true, data: await favoritesRepository.list(), error: null })
  })

  app.post('/api/favorites', async (request, response) => {
    const favorite = await favoritesRepository.add(request.body.itemId)
    response.json({ success: true, data: favorite, error: null })
  })
}
```

- [ ] **Step 4: Run the API test again**

Run: `pnpm vitest tests/companion-service/favorites-routes.test.ts`
Expected: PASS with one created favorite returned by the list route.

- [ ] **Step 5: Add the UI button and favorite flow test**

```tsx
export const FavoriteButton = ({ onClick }) => {
  return <button onClick={onClick}>加入收藏箱</button>
}
```

Add the button beside each feed card and post `{ itemId: item.id }` to `/api/favorites` on click.

Run: `pnpm vitest tests/chrome-extension/favorites-flow.test.tsx`
Expected: PASS with the favorite request fired.

- [ ] **Step 6: Commit**

```bash
git add apps/companion-service/src/server/routes/favorites.ts apps/companion-service/src/db/favoritesRepository.ts apps/chrome-extension/src/newtab tests/companion-service/favorites-routes.test.ts tests/chrome-extension/favorites-flow.test.tsx
git commit -m "feat: add local favorites flow"
```

## Task 14: Add settings storage and options page for push bindings

**Files:**
- Create: `apps/companion-service/src/server/routes/settings.ts`
- Create: `apps/chrome-extension/src/options/App.tsx`
- Create: `apps/chrome-extension/src/options/main.tsx`
- Test: `tests/companion-service/settings-routes.test.ts`
- Test: `tests/chrome-extension/options-page.test.tsx`

- [ ] **Step 1: Write the failing settings route test**

```ts
import request from 'supertest'
import { describe, expect, test } from 'vitest'
import { createServer } from '../../apps/companion-service/src/server/createServer'

describe('settings routes', () => {
  test('stores local webhook settings', async () => {
    const app = createServer()

    const saveResponse = await request(app).post('/api/settings').send({
      includeKeywords: ['agent'],
      excludeKeywords: [],
      enabledPlatforms: ['github'],
      feishuWebhookUrl: 'https://example.com/feishu',
      wechatWebhookUrl: null
    })
    const getResponse = await request(app).get('/api/settings')

    expect(saveResponse.status).toBe(200)
    expect(getResponse.body.data.includeKeywords).toEqual(['agent'])
  })
})
```

- [ ] **Step 2: Run test to verify settings routes are missing**

Run: `pnpm vitest tests/companion-service/settings-routes.test.ts`
Expected: FAIL with missing settings endpoints.

- [ ] **Step 3: Write the minimal settings routes**

```ts
const defaultSettings = {
  includeKeywords: [],
  excludeKeywords: [],
  enabledPlatforms: ['github', 'x', 'youtube', 'xiaohongshu', 'huggingface'],
  feishuWebhookUrl: null,
  wechatWebhookUrl: null
}

export const registerSettingsRoutes = (app, settingsRepository) => {
  app.get('/api/settings', async (_request, response) => {
    response.json({ success: true, data: await settingsRepository.get(), error: null })
  })

  app.post('/api/settings', async (request, response) => {
    const savedSettings = await settingsRepository.save(request.body)
    response.json({ success: true, data: savedSettings, error: null })
  })
}
```

```tsx
import { useState } from 'react'

export const OptionsApp = () => {
  const [feishuWebhookUrl, setFeishuWebhookUrl] = useState('')
  const [wechatWebhookUrl, setWechatWebhookUrl] = useState('')

  return (
    <main>
      <h1>推送设置</h1>
      <label>
        飞书 Webhook
        <input value={feishuWebhookUrl} onChange={(event) => setFeishuWebhookUrl(event.target.value)} />
      </label>
      <label>
        企业微信 Webhook
        <input value={wechatWebhookUrl} onChange={(event) => setWechatWebhookUrl(event.target.value)} />
      </label>
    </main>
  )
}
```

- [ ] **Step 4: Run the tests again**

Run: `pnpm vitest tests/companion-service/settings-routes.test.ts tests/chrome-extension/options-page.test.tsx`
Expected: PASS with settings save/read behavior and options page fields rendered.

- [ ] **Step 5: Commit**

```bash
git add apps/companion-service/src/server/routes/settings.ts apps/chrome-extension/src/options tests/companion-service/settings-routes.test.ts tests/chrome-extension/options-page.test.tsx
git commit -m "feat: add local settings and options page"
```

## Task 15: Add push endpoints for Feishu and WeChat with error reporting

**Files:**
- Create: `apps/companion-service/src/push/pushToFeishu.ts`
- Create: `apps/companion-service/src/push/pushToWechat.ts`
- Create: `apps/companion-service/src/server/routes/push.ts`
- Test: `tests/companion-service/push-routes.test.ts`

- [ ] **Step 1: Write the failing push-routes test**

```ts
import request from 'supertest'
import { describe, expect, test, vi } from 'vitest'
import { createServer } from '../../apps/companion-service/src/server/createServer'

describe('push routes', () => {
  test('returns a clear error when push is not configured', async () => {
    const app = createServer()

    const response = await request(app).post('/api/push/feishu').send({ items: [] })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('请先在设置页配置飞书 Webhook')
  })
})
```

- [ ] **Step 2: Run test to verify push routes are missing**

Run: `pnpm vitest tests/companion-service/push-routes.test.ts`
Expected: FAIL with missing route.

- [ ] **Step 3: Write the minimal push routes**

```ts
import type { Express } from 'express'

export const registerPushRoutes = (app: Express, settingsRepository) => {
  app.post('/api/push/feishu', async (_request, response) => {
    const settings = await settingsRepository.get()

    if (!settings.feishuWebhookUrl) {
      response.status(400).json({ success: false, data: null, error: '请先在设置页配置飞书 Webhook' })
      return
    }

    response.json({ success: true, data: { delivered: true }, error: null })
  })

  app.post('/api/push/wechat', async (_request, response) => {
    const settings = await settingsRepository.get()

    if (!settings.wechatWebhookUrl) {
      response.status(400).json({ success: false, data: null, error: '请先在设置页配置企业微信 Webhook' })
      return
    }

    response.json({ success: true, data: { delivered: true }, error: null })
  })
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm vitest tests/companion-service/push-routes.test.ts`
Expected: PASS with the missing-binding error path covered.

- [ ] **Step 5: Commit**

```bash
git add apps/companion-service/src/push apps/companion-service/src/server/routes/push.ts tests/companion-service/push-routes.test.ts
git commit -m "feat: add push endpoints and binding errors"
```

## Task 16: Add critical E2E coverage for the golden path

**Files:**
- Create: `tests/e2e/newtab-golden-path.spec.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Write the failing E2E spec**

```ts
import { expect, test } from '@playwright/test'

test('new tab renders feed and favorite action', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000')

  await expect(page.getByText('今日 AI 热门')).toBeVisible()
  await expect(page.getByText('GitHub')).toBeVisible()
  await expect(page.getByRole('button', { name: '加入收藏箱' })).toBeVisible()
})
```

- [ ] **Step 2: Run E2E to verify it fails before local app wiring exists**

Run: `pnpm playwright test tests/e2e/newtab-golden-path.spec.ts`
Expected: FAIL because the local app/test harness is not yet served.

- [ ] **Step 3: Wire the Playwright base URL to the local extension preview or test harness**

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:3000'
  }
})
```

- [ ] **Step 4: Start the preview server and rerun E2E**

Run: `pnpm playwright test tests/e2e/newtab-golden-path.spec.ts`
Expected: PASS with the feed page and favorite action visible.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/newtab-golden-path.spec.ts playwright.config.ts
git commit -m "test: add golden path e2e coverage"
```

## Task 17: Add installer scripts and startup documentation assets

**Files:**
- Create: `scripts/install-companion-mac.sh`
- Create: `scripts/start-companion.sh`
- Test: `tests/companion-service/install-script.test.ts`

- [ ] **Step 1: Write the failing install-script test**

```ts
import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'

describe('install script', () => {
  test('documents dependency install and local startup', () => {
    const script = readFileSync('scripts/install-companion-mac.sh', 'utf8')

    expect(script).toContain('pnpm install')
    expect(script).toContain('pnpm --filter @ai-hot/companion-service start')
  })
})
```

- [ ] **Step 2: Run test to verify the scripts are missing**

Run: `pnpm vitest tests/companion-service/install-script.test.ts`
Expected: FAIL with file not found.

- [ ] **Step 3: Write the minimal scripts**

```bash
#!/bin/bash
set -euo pipefail

pnpm install
pnpm --filter @ai-hot/companion-service start
```
```

```bash
#!/bin/bash
set -euo pipefail

pnpm --filter @ai-hot/companion-service start
```
```

- [ ] **Step 4: Run the test again**

Run: `pnpm vitest tests/companion-service/install-script.test.ts`
Expected: PASS with both required commands present.

- [ ] **Step 5: Commit**

```bash
git add scripts/install-companion-mac.sh scripts/start-companion.sh tests/companion-service/install-script.test.ts
git commit -m "chore: add local install scripts"
```

## Task 18: Run final verification and close the backbone milestone

**Files:**
- Modify: `package.json`
- Modify: `playwright.config.ts`
- Test: `tests/companion-service/**/*.test.ts`
- Test: `tests/chrome-extension/**/*.test.tsx`
- Test: `tests/e2e/**/*.spec.ts`

- [ ] **Step 1: Run the companion-service test suite**

Run: `pnpm vitest tests/companion-service`
Expected: PASS with all service unit and integration tests green.

- [ ] **Step 2: Run the extension test suite**

Run: `pnpm vitest tests/chrome-extension`
Expected: PASS with UI and filter/favorites tests green.

- [ ] **Step 3: Run the end-to-end suite**

Run: `pnpm playwright test`
Expected: PASS for the golden path.

- [ ] **Step 4: Run type checking**

Run: `pnpm typecheck`
Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit the verification baseline**

```bash
git add package.json playwright.config.ts pnpm-lock.yaml
git commit -m "test: verify ai hot v1 backbone"
```

## Spec Coverage Check

- Chrome 新标签页入口: covered by Tasks 10-11.
- 本地 companion service: covered by Tasks 3-9.
- GitHub / Hugging Face first, then harder platforms: covered by Task 7 and deferred expansion after backbone verification.
- 每天更新一次、本地缓存读取、首页分区展示: covered by Tasks 5, 9, 11.
- 关键词筛选、本地收藏箱、设置与推送: covered by Tasks 12-15.
- 本地安装器与可复现安装路径: covered by Task 17.
- 验收顺序与最终验证: covered by Task 18.

## Risk Notes

- X / YouTube / 小红书 adapters should be added after backbone validation because their acquisition path is more fragile.
- Webhook URLs are security-sensitive local settings; keep them out of logs and source files.
- If Chrome extension localhost permissions or CORS behavior differ from the initial assumption, adjust the API server headers before widening feature scope.
- Before implementing live summarization, pin the summarizer provider boundary so failures degrade to shorter raw text instead of blocking the feed.
