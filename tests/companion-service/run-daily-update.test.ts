import type { FeedItem, PlatformStatus } from '@ai-hot/shared'
import { describe, expect, test, vi } from 'vitest'

import { runDailyUpdate } from '../../apps/companion-service/src/scheduler/runDailyUpdate'

const NOW = '2026-05-23T12:00:00.000Z'

const createFeedItem = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  id: 'github:1',
  platform: 'github',
  title: 'Repo',
  summary: 'Useful summary',
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

describe('runDailyUpdate', () => {
  test('collects, summarizes, and persists the flattened daily feed with platform statuses', async () => {
    // Arrange
    const collectedFeed = {
      platformBuckets: {
        github: [createFeedItem()],
        x: [],
        youtube: [],
        huggingface: [
          createFeedItem({
            id: 'huggingface:1',
            platform: 'huggingface',
            title: 'Model',
            sourceId: 'hf-1'
          })
        ]
      },
      platformStatuses: [
        createPlatformStatus({ platform: 'github' }),
        createPlatformStatus({
          platform: 'x',
          state: 'not_logged_in',
          detail: '当前浏览器未登录该平台',
          lastCollectedAt: null
        }),
        createPlatformStatus({ platform: 'youtube' }),
        
        createPlatformStatus({ platform: 'huggingface' })
      ]
    }
    const summarizedFeed = [
      createFeedItem(),
      createFeedItem({
        id: 'huggingface:1',
        platform: 'huggingface',
        title: 'Model',
        sourceId: 'hf-1',
        summary: 'Summarized model'
      })
    ]
    const collectTodayFeed = vi.fn().mockResolvedValue(collectedFeed)
    const summarizeItems = vi.fn().mockResolvedValue(summarizedFeed)
    const replaceTodayFeed = vi.fn()
    const replacePlatformStatuses = vi.fn()

    // Act
    const result = await runDailyUpdate({
      collectTodayFeed,
      summarizeItems,
      replaceTodayFeed,
      replacePlatformStatuses
    })

    // Assert
    expect(collectTodayFeed).toHaveBeenCalledTimes(1)
    expect(summarizeItems).toHaveBeenCalledWith([
      createFeedItem(),
      createFeedItem({
        id: 'huggingface:1',
        platform: 'huggingface',
        title: 'Model',
        sourceId: 'hf-1'
      })
    ])
    expect(replaceTodayFeed).toHaveBeenCalledWith(summarizedFeed)
    expect(replacePlatformStatuses).toHaveBeenCalledWith([
      createPlatformStatus({ platform: 'github' }),
      createPlatformStatus({
        platform: 'x',
        state: 'not_logged_in',
        detail: '当前浏览器未登录该平台',
        lastCollectedAt: null
      }),
      createPlatformStatus({
        platform: 'youtube',
        state: 'no_results',
        lastCollectedAt: null
      }),
      
      createPlatformStatus({ platform: 'huggingface' })
    ])
    expect(result).toEqual({
      items: summarizedFeed,
      platformStatuses: [
        createPlatformStatus({ platform: 'github' }),
        createPlatformStatus({
          platform: 'x',
          state: 'not_logged_in',
          detail: '当前浏览器未登录该平台',
          lastCollectedAt: null
        }),
        createPlatformStatus({
          platform: 'youtube',
          state: 'no_results',
          lastCollectedAt: null
        }),
        
        createPlatformStatus({ platform: 'huggingface' })
      ]
    })
  })

  test('persists platform statuses after replacing the daily feed', async () => {
    // Arrange
    const collectedFeed = {
      platformBuckets: {
        github: [createFeedItem()],
        x: [],
        youtube: [],
        huggingface: []
      },
      platformStatuses: [
        createPlatformStatus({ platform: 'github' }),
        createPlatformStatus({
          platform: 'x',
          state: 'no_results',
          lastCollectedAt: null
        }),
        createPlatformStatus({
          platform: 'youtube',
          state: 'no_results',
          lastCollectedAt: null
        }),
        
        createPlatformStatus({
          platform: 'huggingface',
          state: 'no_results',
          lastCollectedAt: null
        })
      ]
    }
    const collectTodayFeed = vi.fn().mockResolvedValue(collectedFeed)
    const summarizeItems = vi.fn().mockResolvedValue([createFeedItem()])
    const replaceTodayFeed = vi.fn()
    const replacePlatformStatuses = vi.fn()

    // Act
    await runDailyUpdate({
      collectTodayFeed,
      summarizeItems,
      replaceTodayFeed,
      replacePlatformStatuses
    })

    // Assert
    expect(replaceTodayFeed).toHaveBeenCalledBefore(replacePlatformStatuses)
    expect(replacePlatformStatuses).toHaveBeenCalledTimes(1)
  })

  test('rethrows collection errors without attempting to summarize or persist statuses', async () => {
    // Arrange
    const collectTodayFeed = vi.fn().mockRejectedValue(new Error('collection failed'))
    const summarizeItems = vi.fn()
    const replaceTodayFeed = vi.fn()
    const replacePlatformStatuses = vi.fn()

    // Act / Assert
    await expect(
      runDailyUpdate({
        collectTodayFeed,
        summarizeItems,
        replaceTodayFeed,
        replacePlatformStatuses
      })
    ).rejects.toThrow('collection failed')
    expect(summarizeItems).not.toHaveBeenCalled()
    expect(replaceTodayFeed).not.toHaveBeenCalled()
    expect(replacePlatformStatuses).not.toHaveBeenCalled()
  })
})
