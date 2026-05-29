import type { FeedItem } from '@ai-hot/shared'

const normalizeText = (value: string) => value.trim()

const normalizeTags = (rawTags: FeedItem['rawTags']) =>
  rawTags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

export const normalizeItem = (item: FeedItem): FeedItem => ({
  ...item,
  title: normalizeText(item.title),
  summary: normalizeText(item.summary),
  rawTags: normalizeTags(item.rawTags)
})
