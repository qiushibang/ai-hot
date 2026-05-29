import { API_ROUTES, type FeedItem, type Platform, type PlatformStatus } from '@ai-hot/shared'
import { afterEach, describe, expect, test } from 'vitest'
import type { AddressInfo, Server } from 'node:net'

import { createServer } from '../../apps/companion-service/src/server/createServer'

const TEST_HOST = '127.0.0.1'
const EMPTY_BUCKET_MESSAGE = '今日结果较少'

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

const createPlatformStatus = (
  platform: Platform,
  overrides: Partial<PlatformStatus> = {}
): PlatformStatus => ({
  platform,
  state: 'ready',
  detail: null,
  lastUpdatedAt: '2026-05-23T10:00:00.000Z',
  lastCollectedAt: '2026-05-23T10:00:00.000Z',
  ...overrides
})

describe('companion service feed routes', () => {
  let activeServer: Server | null = null

  afterEach(async () => {
    if (!activeServer) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      activeServer?.close((error?: Error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })

    activeServer = null
  })

  test('returns persisted platform buckets for today feed', async () => {
    // Arrange
    const app = createServer({
      feedRepository: {
        getTodayFeedByPlatform(platform) {
          if (platform === 'github') {
            return [createFeedItem('github', { title: 'Persisted repo' })]
          }

          return []
        },
        replaceTodayFeed: () => {}
      },
      platformStatusRepository: {
        getAll() {
          return [createPlatformStatus('github')]
        },
        replaceAll: () => {}
      }
    })

    activeServer = await new Promise<Server>((resolve) => {
      const server = app.listen(0, TEST_HOST, () => {
        resolve(server)
      })
    })

    const address = activeServer.address() as AddressInfo | string | null

    if (!address || typeof address === 'string') {
      throw new Error('Expected server to listen on a TCP port')
    }

    // Act
    const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.todayFeed}`)
    const payload = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        github: {
          items: [createFeedItem('github', { title: 'Persisted repo' })],
          message: null,
          state: 'ready'
        },
        x: {
          items: [],
          message: EMPTY_BUCKET_MESSAGE,
          state: 'no_results'
        },
        youtube: {
          items: [],
          message: EMPTY_BUCKET_MESSAGE,
          state: 'no_results'
        },
        huggingface: {
          items: [],
          message: EMPTY_BUCKET_MESSAGE,
          state: 'no_results'
        }
      },
      error: null
    })
  })

  test('returns empty platform buckets for today feed', async () => {
    // Arrange
    const app = createServer()

    activeServer = await new Promise<Server>((resolve) => {
      const server = app.listen(0, TEST_HOST, () => {
        resolve(server)
      })
    })

    const address = activeServer.address() as AddressInfo | string | null

    if (!address || typeof address === 'string') {
      throw new Error('Expected server to listen on a TCP port')
    }

    // Act
    const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.todayFeed}`)
    const payload = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        github: {
          items: [],
          message: EMPTY_BUCKET_MESSAGE,
          state: 'no_results'
        },
        x: {
          items: [],
          message: EMPTY_BUCKET_MESSAGE,
          state: 'no_results'
        },
        youtube: {
          items: [],
          message: EMPTY_BUCKET_MESSAGE,
          state: 'no_results'
        },
        huggingface: {
          items: [],
          message: EMPTY_BUCKET_MESSAGE,
          state: 'no_results'
        }
      },
      error: null
    })
  })
})