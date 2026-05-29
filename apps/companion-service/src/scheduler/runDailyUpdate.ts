import type { FeedItem, Platform, PlatformStatus } from '@ai-hot/shared'

const PLATFORM_ORDER = ['github', 'x', 'youtube', 'huggingface'] as const

type PlatformBuckets = Record<(typeof PLATFORM_ORDER)[number], FeedItem[]>
type DailyCollectionResult = {
  platformBuckets: PlatformBuckets
  platformStatuses: PlatformStatus[]
}
type DailyUpdateResult = {
  items: FeedItem[]
  platformStatuses: PlatformStatus[]
}

/* eslint-disable no-unused-vars */
type RunDailyUpdateDependencies = {
  collectTodayFeed: () => Promise<DailyCollectionResult>
  summarizeItems: (items: FeedItem[]) => Promise<FeedItem[]>
  replaceTodayFeed: (items: FeedItem[]) => void | Promise<void>
  replacePlatformStatuses: (statuses: PlatformStatus[]) => void | Promise<void>
}
/* eslint-enable no-unused-vars */

const flattenPlatformBuckets = (platformBuckets: PlatformBuckets): FeedItem[] => {
  return PLATFORM_ORDER.flatMap((platform) => platformBuckets[platform])
}

const mergeSummarizedItems = ({
  platformBuckets,
  summarizedItems
}: {
  platformBuckets: PlatformBuckets
  summarizedItems: FeedItem[]
}): PlatformBuckets => {
  const summarizedItemsById = new Map(summarizedItems.map((item) => [item.id, item]))

  return PLATFORM_ORDER.reduce(
    (platformBucketsByPlatform, platform) => ({
      ...platformBucketsByPlatform,
      [platform]: platformBuckets[platform].map(
        (item) => summarizedItemsById.get(item.id) ?? item
      )
    }),
    {} as Record<Platform, FeedItem[]>
  )
}

const updatePlatformStatuses = ({
  platformStatuses,
  summarizedBuckets
}: {
  platformStatuses: PlatformStatus[]
  summarizedBuckets: PlatformBuckets
}): PlatformStatus[] => {
  return platformStatuses.map((status) => {
    if (status.state !== 'ready' && status.state !== 'no_results') {
      return status
    }

    const itemCount = summarizedBuckets[status.platform].length

    return {
      ...status,
      state: itemCount > 0 ? 'ready' : 'no_results',
      detail: itemCount > 0 ? null : status.detail,
      lastCollectedAt: itemCount > 0 ? status.lastCollectedAt : null
    }
  })
}

export const runDailyUpdate = async ({
  collectTodayFeed,
  summarizeItems,
  replaceTodayFeed,
  replacePlatformStatuses
}: RunDailyUpdateDependencies): Promise<DailyUpdateResult> => {
  const { platformBuckets, platformStatuses } = await collectTodayFeed()
  const summarizedItems = await summarizeItems(flattenPlatformBuckets(platformBuckets))
  const summarizedBuckets = mergeSummarizedItems({
    platformBuckets,
    summarizedItems
  })
  const nextPlatformStatuses = updatePlatformStatuses({
    platformStatuses,
    summarizedBuckets
  })

  await replaceTodayFeed(summarizedItems)
  await replacePlatformStatuses(nextPlatformStatuses)

  return {
    items: summarizedItems,
    platformStatuses: nextPlatformStatuses
  }
}
