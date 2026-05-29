import {
  API_ROUTES,
  type FeedItem,
  type Platform,
  type PlatformCollectionState,
  type PlatformStatus
} from '@ai-hot/shared'
import { Router } from 'express'

const EMPTY_BUCKET_MESSAGE = '今日结果较少'

/* eslint-disable no-unused-vars */
type FeedRepository = {
  getTodayFeedByPlatform: (platform: Platform) => FeedItem[]
  replaceTodayFeed: (items: FeedItem[]) => void
}

type PlatformStatusRepository = {
  getAll: () => PlatformStatus[]
  replaceAll: (statuses: PlatformStatus[]) => void
}

type CollectFeedResult = {
  platformBuckets: Record<Platform, FeedItem[]>
  platformStatuses: PlatformStatus[]
}
/* eslint-enable no-unused-vars */

// eslint-disable-next-line no-unused-vars
type CollectFeedFunction = (_searchQuery: string) => Promise<CollectFeedResult>

const createEmptyFeedRepository = (): FeedRepository => ({
  getTodayFeedByPlatform: () => [],
  replaceTodayFeed: () => {}
})

const createEmptyPlatformStatusRepository = (): PlatformStatusRepository => ({
  getAll: () => [],
  replaceAll: () => {}
})

const getBucketState = ({
  items,
  platformStatus
}: {
  items: FeedItem[]
  platformStatus: PlatformStatus | undefined
}): PlatformCollectionState => {
  if (platformStatus) {
    return platformStatus.state
  }

  return items.length === 0 ? 'no_results' : 'ready'
}

const getBucketMessage = ({
  items,
  platformStatus
}: {
  items: FeedItem[]
  platformStatus: PlatformStatus | undefined
}): string | null => {
  if (platformStatus?.detail) {
    return platformStatus.detail
  }

  return items.length === 0 ? EMPTY_BUCKET_MESSAGE : null
}

const createBucket = ({
  items,
  platformStatus
}: {
  items: FeedItem[]
  platformStatus: PlatformStatus | undefined
}) => ({
  items,
  message: getBucketMessage({ items, platformStatus }),
  state: getBucketState({ items, platformStatus })
})

const createTodayFeed = ({
  feedRepository,
  platformStatusRepository
}: {
  feedRepository: FeedRepository
  platformStatusRepository: PlatformStatusRepository
}) => {
  const platformStatuses = new Map(
    platformStatusRepository.getAll().map((platformStatus) => [platformStatus.platform, platformStatus])
  )

  return {
    github: createBucket({
      items: feedRepository.getTodayFeedByPlatform('github'),
      platformStatus: platformStatuses.get('github')
    }),
    x: createBucket({
      items: feedRepository.getTodayFeedByPlatform('x'),
      platformStatus: platformStatuses.get('x')
    }),
    youtube: createBucket({
      items: feedRepository.getTodayFeedByPlatform('youtube'),
      platformStatus: platformStatuses.get('youtube')
    }),
    huggingface: createBucket({
      items: feedRepository.getTodayFeedByPlatform('huggingface'),
      platformStatus: platformStatuses.get('huggingface')
    })
  }
}

export const createFeedRouter = ({
  feedRepository = createEmptyFeedRepository(),
  platformStatusRepository = createEmptyPlatformStatusRepository(),
  collectFeed
}: {
  feedRepository?: FeedRepository
  platformStatusRepository?: PlatformStatusRepository
  collectFeed?: CollectFeedFunction
} = {}) => {
  const feedRouter = Router()

  feedRouter.get(API_ROUTES.todayFeed, (_request, response) => {
    response.status(200).json({
      success: true,
      data: createTodayFeed({ feedRepository, platformStatusRepository }),
      error: null
    })
  })

  feedRouter.post(API_ROUTES.collect, async (request, response) => {
    if (!collectFeed) {
      response.status(501).json({
        success: false,
        data: null,
        error: 'on-demand collection is not configured'
      })
      return
    }

    const { searchQuery } = request.body as { searchQuery?: string }

    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length === 0) {
      response.status(400).json({
        success: false,
        data: null,
        error: 'searchQuery is required'
      })
      return
    }

    try {
      const { platformBuckets, platformStatuses } = await collectFeed(searchQuery.trim())

      const allItems = Object.values(platformBuckets).flat()
      feedRepository.replaceTodayFeed(allItems)
      platformStatusRepository.replaceAll(platformStatuses)

      response.status(200).json({
        success: true,
        data: createTodayFeed({ feedRepository, platformStatusRepository }),
        error: null
      })
    } catch (error) {
      response.status(500).json({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'collection failed'
      })
    }
  })

  return feedRouter
}

export type { FeedRepository, PlatformStatusRepository }
