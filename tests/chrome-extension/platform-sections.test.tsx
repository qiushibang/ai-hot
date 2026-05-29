import type { FeedItem, Platform, PlatformCollectionState } from '@ai-hot/shared'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { App } from '../../apps/chrome-extension/src/newtab/App'
import { fetchTodayFeed } from '../../apps/chrome-extension/src/newtab/lib/fetchTodayFeed'

type FeedBucket = {
  items: FeedItem[]
  message: string | null
  state: PlatformCollectionState
}

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

const createBucket = (
  items: FeedItem[],
  message: string | null = null,
  state: PlatformCollectionState = items.length === 0 ? 'no_results' : 'ready'
): FeedBucket => ({
  items,
  message,
  state
})

describe('platform sections', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
  })

  test('fetchTodayFeed returns the parsed feed payload from the companion service', async () => {
    // Arrange
    const payload = {
      github: createBucket([createFeedItem('github')]),
      x: createBucket([]),
      youtube: createBucket([]),
      huggingface: createBucket([])
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: payload, error: null })
    })

    // Act
    const result = await fetchTodayFeed(fetchMock)

    // Assert
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:4317/api/feed/today')
    expect(result).toEqual(payload)
  })

  test('renders populated platform sections after the companion service connects', async () => {
    // Arrange
    const feed = {
      github: createBucket([createFeedItem('github', { title: 'Repo 1', summary: 'GitHub summary' })]),
      x: createBucket([]),
      youtube: createBucket([
        createFeedItem('youtube', { title: 'Video 1', summary: 'YouTube summary' })
      ]),
      huggingface: createBucket([])
    }
    const fetchStatus = vi.fn().mockResolvedValue('connected')
    const loadTodayFeed = vi.fn().mockResolvedValue(feed)

    // Act
    render(<App fetchStatus={fetchStatus} loadTodayFeed={loadTodayFeed} />)

    // Assert
    expect(await screen.findByRole('heading', { name: 'GitHub', level: 2 })).toBeDefined()
    expect(await screen.findByText('Repo 1')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'YouTube', level: 2 })).toBeDefined()
    expect(screen.getByText('Video 1')).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'X / Twitter', level: 2 })).toBeNull()
  })

  test('renders platform status messaging for unavailable buckets', async () => {
    // Arrange
    const feed = {
      github: createBucket([]),
      x: createBucket([], '当前浏览器未登录该平台', 'not_logged_in'),
      youtube: createBucket([], '本机 Chrome 不可用', 'browser_unavailable'),
      huggingface: createBucket([], '解析失败', 'parse_failed')
    }
    const fetchStatus = vi.fn().mockResolvedValue('connected')
    const loadTodayFeed = vi.fn().mockResolvedValue(feed)

    // Act
    render(<App fetchStatus={fetchStatus} loadTodayFeed={loadTodayFeed} />)

    // Assert
    expect(await screen.findByRole('heading', { name: 'X / Twitter', level: 2 })).toBeDefined()
    expect(screen.getByText('当前浏览器未登录该平台')).toBeDefined()
    expect(screen.getByText('未登录')).toBeDefined()
    expect(screen.getByText('Chrome 不可用')).toBeDefined()
    expect(screen.getByText('抓取失败')).toBeDefined()
  })

  test('shows a feed error message when the feed request fails after connection succeeds', async () => {
    // Arrange
    const fetchStatus = vi.fn().mockResolvedValue('connected')
    const loadTodayFeed = vi.fn().mockRejectedValue(new Error('feed failed'))

    // Act
    render(<App fetchStatus={fetchStatus} loadTodayFeed={loadTodayFeed} />)

    // Assert
    expect(await screen.findByText('无法加载今日内容')).toBeDefined()
    expect(screen.getByText('请检查 companion service 是否正常运行后重试。')).toBeDefined()
  })
})
