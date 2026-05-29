import type { Settings } from '@ai-hot/shared'

import type { TodayFeed } from './fetchTodayFeed'

type FeedFilters = Pick<Settings, 'includeKeywords' | 'excludeKeywords' | 'enabledPlatforms'>

const normalizeText = (value: string) => value.trim().toLowerCase()

const matchesKeyword = (text: string, keyword: string) => {
  const normalizedKeyword = normalizeText(keyword)

  return normalizedKeyword.length > 0 && normalizeText(text).includes(normalizedKeyword)
}

const getSearchableText = (item: TodayFeed[keyof TodayFeed]['items'][number]) => {
  return [item.title, item.summary, item.author, ...item.rawTags].join(' ')
}

export const filterFeed = (feed: TodayFeed, filters: FeedFilters): TodayFeed => {
  return {
    github: filterBucket(feed.github, 'github', filters),
    x: filterBucket(feed.x, 'x', filters),
    youtube: filterBucket(feed.youtube, 'youtube', filters),
    huggingface: filterBucket(feed.huggingface, 'huggingface', filters)
  }
}

const filterBucket = (
  bucket: TodayFeed[keyof TodayFeed],
  platform: keyof TodayFeed,
  filters: FeedFilters
): TodayFeed[keyof TodayFeed] => {
  if (!filters.enabledPlatforms.includes(platform)) {
    return {
      ...bucket,
      items: [],
      message: null
    }
  }

  const items = bucket.items.filter((item) => {
    const searchableText = getSearchableText(item)
    const matchesInclude =
      filters.includeKeywords.length === 0 ||
      filters.includeKeywords.some((keyword) => matchesKeyword(searchableText, keyword))
    const matchesExclude = filters.excludeKeywords.some((keyword) => matchesKeyword(searchableText, keyword))

    return matchesInclude && !matchesExclude
  })

  return {
    ...bucket,
    items,
    message: bucket.items.length === 0 ? bucket.message : items.length === 0 ? null : bucket.message
  }
}
