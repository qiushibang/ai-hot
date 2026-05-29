import type { FeedItem } from '@ai-hot/shared'

const isMoreRecent = (currentItem: FeedItem, nextItem: FeedItem) =>
  new Date(nextItem.publishedAt).getTime() > new Date(currentItem.publishedAt).getTime()

export const dedupeItems = (items: FeedItem[]): FeedItem[] => {
  const uniqueItemsBySourceId = new Map<string, FeedItem>()

  for (const item of items) {
    const existingItem = uniqueItemsBySourceId.get(item.sourceId)

    if (!existingItem || isMoreRecent(existingItem, item)) {
      uniqueItemsBySourceId.set(item.sourceId, item)
    }
  }

  return [...uniqueItemsBySourceId.values()]
}
