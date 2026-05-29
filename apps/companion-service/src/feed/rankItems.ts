import type { FeedItem } from '@ai-hot/shared'

const HOURS_PER_MILLISECOND = 1000 * 60 * 60
const TIME_DECAY_WEIGHT = 0.1

const getPublishedAtTime = (publishedAt: string) => new Date(publishedAt).getTime()

const getHoursSincePublished = (publishedAt: string, referenceTime: number) => {
  const publishedAtTime = getPublishedAtTime(publishedAt)

  return Math.max(0, (referenceTime - publishedAtTime) / HOURS_PER_MILLISECOND)
}

const getRankingScore = (item: FeedItem, referenceTime: number) => {
  const baseScore = item.popularityScore + item.growthScore
  const timeDecay = getHoursSincePublished(item.publishedAt, referenceTime) * TIME_DECAY_WEIGHT

  return baseScore - timeDecay
}

export const rankItems = (items: FeedItem[]): FeedItem[] => {
  const referenceTime = Date.now()

  return [...items].sort((leftItem, rightItem) => {
    const rankingDifference =
      getRankingScore(rightItem, referenceTime) - getRankingScore(leftItem, referenceTime)

    if (rankingDifference !== 0) {
      return rankingDifference
    }

    const publishedAtDifference =
      getPublishedAtTime(rightItem.publishedAt) - getPublishedAtTime(leftItem.publishedAt)

    if (publishedAtDifference !== 0) {
      return publishedAtDifference
    }

    const sourceIdDifference = leftItem.sourceId.localeCompare(rightItem.sourceId)

    if (sourceIdDifference !== 0) {
      return sourceIdDifference
    }

    return leftItem.id.localeCompare(rightItem.id)
  })
}
