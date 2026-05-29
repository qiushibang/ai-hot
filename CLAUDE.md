# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Hot Skill — a monorepo that collects trending AI content from 5 platforms (GitHub, Hugging Face, X/Twitter, YouTube, Xiaohongshu), ranks items, and displays them in a Chrome extension new-tab page.

- **Package manager**: pnpm 10 (workspaces: `apps/*`, `packages/*`)
- **TypeScript**: strict, ES2022, bundler module resolution (`tsconfig.base.json`)
- **Test framework**: Vitest with two projects — `node` for `*.test.ts`, `jsdom` for `*.test.tsx`
- **Database**: better-sqlite3 (synchronous), auto-created tables, no migration framework

## Common Commands

```bash
pnpm test                  # Run all tests (vitest)
pnpm test -- -t "pattern"  # Run tests matching pattern
pnpm typecheck             # tsc --noEmit on tsconfig.base.json
pnpm lint                  # eslint with no-unused-vars:error

# Start companion service (API server on 127.0.0.1:4317)
cd apps/companion-service && pnpm start

# Start Chrome extension dev server (frontend on 127.0.0.1:4173)
cd apps/chrome-extension && npx vite --host 127.0.0.1 --port 4173

# Open the newtab page in browser
open http://127.0.0.1:4173/newtab/index.html

# Run daily update script manually
pnpm run:daily-update
```

## Architecture

### Dependency Injection Pattern

The entire companion service uses DI via default parameters. Every module exports a factory function that accepts its dependencies as an optional object with defaults:

```ts
export const collectTodayFeed = async ({
  githubAdapter = fetchGithubFeed,
  xCdpAdapter = fetchXFeedViaCDP,
  // ...all deps have defaults
}: CollectTodayFeedDependencies = {}): Promise<CollectTodayFeedResult>
```

In tests, you inject mock adapters/repos to isolate the unit under test. Always follow this pattern when adding new modules.

### Feed Collection Pipeline

```
collectTodayFeed()
  ├── GitHub (public REST API, no auth needed)
  ├── Hugging Face (public REST API, no auth needed)
  └── Browser platforms (X, YouTube, Xiaohongshu):
       1. resolveChromeProfile() — discovers running Chrome + reads DevToolsActivePort
       2. createBrowserSession() — connects via CDP ws:// or launches headless Chrome
       3. For each platform, tries 3 tiers in order:
          a. CDP adapter — network interception (page navigates to platform, listens for XHR responses)
          b. API adapter — cookie-authenticated fetch() calls to internal APIs
          c. HTML adapter — Playwright page + JSDOM DOM scraping
          → On failure, falls through to next tier
```

### Key Design Decisions

- **CDP connection uses `ws://` directly**: Chrome 148's HTTP endpoint (`/json/version`) returns 404 on macOS. `resolveChromeProfile` reads `DevToolsActivePort` to build `ws://127.0.0.1:<port>/devtools/browser/<uuid>`.
- **CDP adapters use network interception, not `page.evaluate` fetch**: Direct API calls from `page.evaluate` get blocked by anti-bot (X returns 403, Xiaohongshu returns -101). Instead, navigate to the platform's search page and intercept the API responses the page itself makes — the browser's own requests carry all correct headers/cookies/TLS fingerprints.
- **X `auth_token` is httpOnly**: `document.cookie` can't see it; use `Network.getCookies` via CDP.
- **YouTube always reports `ready`**: Scraping works without login.
- **Cookie storage is best-effort**: `cookies` table stores platform cookies for API-tier adapters. CDP tier bypasses cookie storage entirely.
- **Test database**: Use `createInMemoryDatabase()` for tests — provides `:memory:` SQLite.

### CookieAuthFetcher Behavior

`createCookieAuthFetcher({ platform, cookiesRepo, extractCookies })` returns an `AuthFetchFunction`:
1. Loads cookie from SQLite → if null, extracts+stores fresh cookie
2. Attaches cookie to request `Cookie` header
3. On 401/403: re-extracts cookies → if changed, retries once → if still fails, throws `CookieAuthError`

### Shared Types (`packages/shared`)

- `Platform`: `'github' | 'x' | 'youtube' | 'xiaohongshu' | 'huggingface'`
- `FeedItem`: id, platform, title, summary, url, author, publishedAt, popularityScore, growthScore, rawTags, sourceId
- `PlatformStatus`: platform, state (ready/no_results/not_logged_in/parse_failed/...), detail, lastUpdatedAt, lastCollectedAt
- `API_ROUTES`: all API path constants
- All types are Zod-validated at parse boundaries

### API Response Format

All companion service endpoints return: `{ success: boolean, data: T | null, error: string | null }`