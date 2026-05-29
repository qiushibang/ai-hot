# Topic Search & Real-time Collection — Design Spec

**Date**: 2026-05-26
**Status**: approved

## Purpose

用户在新标签页输入主题词，点击按钮实时抓取各平台相关内容，替换当前页面展示。不持久化。

## Data Flow

```
User inputs "AI agent" + selects platforms → clicks "抓取"
  → POST /api/feed/collect { query: "AI agent", platforms: ["github","x","youtube"] }
  → Backend runs full collection pipeline (CDP → cookies → API adapters with searchQuery)
  → Returns { platformBuckets: Record<Platform, FeedBucket>, platformStatuses: PlatformStatus[] }
  → Frontend replaces feed state entirely (no persistence)
```

## Backend Changes

### New Route: `POST /api/feed/collect`

- **Body**: `{ query: string, platforms: Platform[] }`
- **Response** (same shape as `GET /api/feed/today`):
  ```json
  {
    "success": true,
    "data": {
      "platformBuckets": { "github": { "items": [...], "message": null, "state": "ready" }, ... },
      "platformStatuses": [...]
    },
    "error": null
  }
  ```
- **Platform filtering**: Backend only collects the platforms specified in the request. If no browser platforms are selected (only GitHub, HuggingFace), the browser session is skipped entirely — saving time.
- **Error handling**: If query is empty or missing, return 400. If collection fails entirely, return 500 with error message. Per-platform errors → captured in `platformStatuses` (state: `parse_failed` / `not_logged_in`), not 500.

### `collectTodayFeed` signature change

New optional parameter `searchQuery?: string`. When provided:
- Passed to every platform adapter as a parameter
- Does NOT persist results to SQLite (returns in-memory only)
- Still runs full pipeline: session creation → cookie extraction → API adapter → HTML fallback

### Adapter changes (5 files)

Each adapter accepts an optional `searchQuery` string. If provided, replaces the hardcoded search term:

| Platform | File | Search mechanism |
|----------|------|-----------------|
| GitHub | `fetchGithubFeed.ts` | `topic:{query}` (was `topic:artificial-intelligence`) |
| X | `fetchXFeedViaApi.ts` | GraphQL SearchTimeline `rawQuery` variable |
| YouTube | `fetchYouTubeFeedViaApi.ts` | InnerTube search `q` field |
| 小红书 | `fetchXiaohongshuFeed.ts` | URL `keyword` param |
| HuggingFace | `fetchHuggingfaceFeed.ts` | Model search `search` param |

### Router wiring

```typescript
// In createFeedRouter or a new router
feedRouter.post('/api/feed/collect', async (req, res) => {
  const { query, platforms } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, data: null, error: 'query is required' })
  }
  const result = await collectTodayFeed({ searchQuery: query.trim() })
  // Filter to requested platforms only
  res.json({ success: true, data: result, error: null })
})
```

## Frontend Changes

### FilterBar → SearchBar

- **Remove**: "包含关键词" input, "排除关键词" input, their state vars (`includeKeywords`, `excludeKeywords`), client-side `filterFeed` filtering
- **Add**: Topic search input (text), "抓取" button, loading spinner
- **Keep**: Platform checkboxes (unchanged)

### App.tsx state changes

- `searchQuery: string` — controlled input value
- `isSearching: boolean` — loading state during collection
- Remove `includeKeywords`, `excludeKeywords`, `filteredFeed` memo

### New lib function: `collectTodayFeed`

```typescript
// apps/chrome-extension/src/newtab/lib/collectTodayFeed.ts
export const collectTodayFeed = async (
  query: string,
  platforms: Platform[],
  fetchImpl = fetch
): Promise<TodayFeed> => {
  const res = await fetchImpl(`${ORIGIN}/api/feed/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, platforms })
  })
  // ... error handling, same pattern as fetchTodayFeed
}
```

### Button behavior

- Idle: shows "抓取"
- Searching: shows spinner + "抓取中…", input and button disabled
- Complete: shows "抓取完成" briefly, then reverts to "抓取"
- Error: shows error message inline, button reverts to "抓取"

## What Does NOT Change

- `run-daily-update.ts` — unchanged, continues using default hardcoded keywords
- Cookie extraction pipeline — unchanged
- `PlatformSection`, `FavoriteButton`, `APP_STYLES` — unchanged
- `/api/feed/today` — unchanged, serves daily persisted feed

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Empty query | 400, error message displayed |
| Backend unreachable | Frontend shows connection error |
| Collection timeout | 500, per-platform errors in statuses |
| Single platform fails | Other platforms return normally, failed one shows `parse_failed` state |
| User not logged into a platform | Cookies missing → `not_logged_in` state for that platform |

## Testing

### Backend tests
- `POST /api/feed/collect` with valid body returns 200
- `POST /api/feed/collect` with empty query returns 400
- `collectTodayFeed({ searchQuery: "test" })` passes query to adapters
- Adapters use searchQuery instead of hardcoded term

### Frontend tests
- SearchBar renders input + button
- Button click triggers collectTodayFeed with correct args
- Loading state disables input during collection
- Feed state is replaced on success
- Error state shown on failure

## Implementation Order

| Step | What | Depends on |
|------|------|-----------|
| 1 | Adapters accept `searchQuery` param | none |
| 2 | `collectTodayFeed` passes `searchQuery` through | Step 1 |
| 3 | `POST /api/feed/collect` route | Step 2 |
| 4 | Frontend SearchBar component | none |
| 5 | Frontend App.tsx integration | Steps 3, 4 |
| 6 | Tests | Steps 1-5 |