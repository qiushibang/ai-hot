import type { FeedItem, Platform } from '@ai-hot/shared'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { App } from '../../apps/chrome-extension/src/newtab/App'
import type { TodayFeed } from '../../apps/chrome-extension/src/newtab/lib/fetchTodayFeed'

vi.mock('../../apps/chrome-extension/src/newtab/lib/collectFeed', () => ({
  collectFeed: vi.fn()
}))

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
    items: [createFeedItem('youtube', { title: 'Cooking video', summary: 'kitchen walkthrough', rawTags: [] })],
    message: null,
    state: 'ready'
  },
  huggingface: {
    items: [],
    message: '今日结果较少',
    state: 'no_results'
  }
})

describe('filter bar', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('renders topic search input and collect button, and filters by platform', async () => {
    const fetchStatus = vi.fn().mockResolvedValue('connected')
    const loadTodayFeed = vi.fn().mockResolvedValue(createFeed())

    render(<App fetchStatus={fetchStatus} loadTodayFeed={loadTodayFeed} />)

    await screen.findByText('AI Agent Repo')
    expect(screen.getByText('Cooking video')).toBeDefined()

    const searchInput = screen.getByPlaceholderText(/输入主题词/)
    expect(searchInput).toBeDefined()

    const collectButton = screen.getByText('抓取')
    expect(collectButton).toBeDefined()

    fireEvent.click(screen.getByLabelText('GitHub 平台'))

    await waitFor(() => {
      expect(screen.queryByText('AI Agent Repo')).toBeNull()
    })
  })
})