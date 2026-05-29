import type { FeedItem } from './feed'

const normalizeText = (value: string) => value.trim().toLowerCase()

const matchesKeyword = (text: string, keyword: string) => {
  const normalizedKeyword = normalizeText(keyword)

  return normalizedKeyword.length > 0 && normalizeText(text).includes(normalizedKeyword)
}

export const getSearchableText = (item: FeedItem) => {
  return [item.title, item.summary, item.author, ...item.rawTags].join(' ')
}

export const filterItemsByKeywords = (
  items: FeedItem[],
  includeKeywords: string[],
  excludeKeywords: string[]
): FeedItem[] => {
  return items.filter((item) => {
    const searchableText = getSearchableText(item)
    const matchesInclude =
      includeKeywords.length === 0 ||
      includeKeywords.some((keyword) => matchesKeyword(searchableText, keyword))
    const matchesExclude = excludeKeywords.some((keyword) => matchesKeyword(searchableText, keyword))

    return matchesInclude && !matchesExclude
  })
}