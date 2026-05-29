import { JSDOM } from 'jsdom'

import { feedItemSchema, type FeedItem } from '@ai-hot/shared'

const DEFAULT_SUMMARY = '热门 YouTube AI 视频'
const DEFAULT_TITLE = 'YouTube video'
const DEFAULT_AUTHOR = 'youtube'
const DEFAULT_PUBLISHED_AT = '2026-05-23T00:00:00.000Z'
const FEED_LIMIT = 10

const parseViewCount = (value: string): number => {
  const normalized = value.replace(/[^0-9.]/g, '')

  return normalized === '' ? 0 : Number(normalized)
}

export const extractYouTubeItems = (html: string): FeedItem[] => {
  const document = new JSDOM(html).window.document

  return Array.from(document.querySelectorAll<Element>('ytd-rich-item-renderer'))
    .slice(0, FEED_LIMIT)
    .map((card: Element) => {
      const url = card.querySelector('#video-title-link')?.getAttribute('href') ?? ''
      const sourceId = new URL(url).searchParams.get('v') ?? 'unknown'
      const title = card.querySelector('#video-title-link')?.textContent?.trim() ?? DEFAULT_TITLE
      const author = card.querySelector('#channel-name')?.textContent?.trim() ?? DEFAULT_AUTHOR
      const publishedAt =
        card.querySelector('time')?.getAttribute('datetime') ?? DEFAULT_PUBLISHED_AT
      const popularityScore = parseViewCount(
        card.querySelector('#metadata-line')?.textContent ?? ''
      )

      return feedItemSchema.parse({
        id: `youtube:${sourceId}`,
        platform: 'youtube',
        title,
        summary: DEFAULT_SUMMARY,
        url,
        author,
        publishedAt,
        popularityScore,
        growthScore: 0,
        rawTags: ['youtube'],
        sourceId
      })
    })
}
