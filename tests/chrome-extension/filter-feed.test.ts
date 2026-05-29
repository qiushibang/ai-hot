import type { FeedItem, Platform } from '@ai-hot/shared'
import { describe, expect, test } from 'vitest'

import { filterFeed } from '../../apps/chrome-extension/src/newtab/lib/filterFeed'
import type { TodayFeed } from '../../apps/chrome-extension/src/newtab/lib/fetchTodayFeed'

const createFeedItem = (platform: Platform, overrides: Partial<FeedItem> = {}): FeedItem => ({
  id: `${platform}:1`,
  platform,
  title: `${platform} project`,
  summary: `${platform} summary`,
  url: `https://example.com/${platform}/1`,
  author: `${platform}-author`,
  publishedAt: '2026-05-21T00:00:00.000Z',
  popularityScore: 10,
  growthScore: 5,
  rawTags: ['ai'],
  sourceId: `${platform}-1`,
  ...overrides
})

const createFeed = (): TodayFeed => ({
  github: {
    items: [createFeedItem('github', { title: 'AI Agent Repo', summary: 'framework' })],
    message: null,
    state: 'ready'
  },
  x: {
    items: [],
    message: '今日结果较少',
    state: 'no_results'
  },
  youtube: {
    items: [createFeedItem('youtube', { title: 'Cooking video', summary: 'not ai', rawTags: [] })],
    message: null,
    state: 'ready'
  },
  huggingface: {
    items: [],
    message: '今日结果较少',
    state: 'no_results'
  }
})

describe('filterFeed', () => {
  test('filters by include keywords, exclude keywords, and enabled platforms', () => {
    // Arrange
    const feed = createFeed()

    // Act
    const filtered = filterFeed(feed, {
      includeKeywords: ['agent'],
      excludeKeywords: ['cooking'],
      enabledPlatforms: ['github']
    })

    // Assert
    expect(filtered.github.items).toHaveLength(1)
    expect(filtered.youtube.items).toHaveLength(0)
    expect(filtered.youtube.message).toBeNull()
    expect(filtered.x.items).toHaveLength(0)
    expect(filtered.x.message).toBeNull()
  })
})
