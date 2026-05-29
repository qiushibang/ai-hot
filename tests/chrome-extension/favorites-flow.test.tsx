import type { FeedItem, Platform } from '@ai-hot/shared'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { App } from '../../apps/chrome-extension/src/newtab/App'
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
    items: [
      createFeedItem('github', { id: 'github:1', title: 'Repo 1' }),
      createFeedItem('github', { id: 'github:2', title: 'Repo 2', url: 'https://example.com/github/2' })
    ],
    message: null,
    state: 'ready'
  },
  x: {
    items: [],
    message: '今日结果较少',
    state: 'no_results'
  },
  youtube: {
    items: [],
    message: '今日结果较少',
    state: 'no_results'
  },
  huggingface: {
    items: [],
    message: '今日结果较少',
    state: 'no_results'
  }
})

describe('favorites flow', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('restores favorited items and posts new favorites from the new-tab feed', async () => {
    // Arrange
    const fetchStatus = vi.fn().mockResolvedValue('connected')
    const loadTodayFeed = vi.fn().mockResolvedValue(createFeed())
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ itemId: 'github:1' }], error: null })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            includeKeywords: [],
            excludeKeywords: [],
            enabledPlatforms: ['github', 'x', 'youtube', 'huggingface'],
            feishuWebhookUrl: null,
            wechatWebhookUrl: null
          },
          error: null
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { itemId: 'github:2' }, error: null })
      })

    vi.stubGlobal('fetch', fetchMock)

    // Act
    render(<App fetchStatus={fetchStatus} loadTodayFeed={loadTodayFeed} />)

    expect(await screen.findByRole('button', { name: '已收藏 Repo 1' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: '收藏 Repo 2' }))

    // Assert
    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://127.0.0.1:4317/api/favorites')
      expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://127.0.0.1:4317/api/settings')
      expect(fetchMock).toHaveBeenNthCalledWith(3, 'http://127.0.0.1:4317/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemId: 'github:2' })
      })
      expect(screen.getByRole('button', { name: '已收藏 Repo 2' })).toBeDefined()
    })
  })
})
