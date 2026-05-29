import { JSDOM } from 'jsdom'

import { feedItemSchema, type FeedItem } from '@ai-hot/shared'

const DEFAULT_SUMMARY = '热门 X / Twitter AI 内容'
const DEFAULT_TITLE = 'X content'
const DEFAULT_AUTHOR = 'x'
const DEFAULT_PUBLISHED_AT = '2026-05-23T00:00:00.000Z'
const FEED_LIMIT = 10

const resolveUrl = (href: string): string => {
  if (!href) return ''
  if (href.startsWith('http')) return href
  return `https://x.com${href}`
}

const TWEET_SELECTORS = [
  'article[role="article"]',
  'article[data-testid="tweet"]',
  'div[data-testid="cellInnerDiv"]'
]

export const extractXItems = (html: string): FeedItem[] => {
  const document = new JSDOM(html).window.document

  let articles: Element[] = []

  for (const selector of TWEET_SELECTORS) {
    articles = Array.from(document.querySelectorAll<Element>(selector))
    if (articles.length > 0) break
  }

  return articles
    .slice(0, FEED_LIMIT)
    .map((article: Element) => {
      const url = resolveUrl(article.querySelector('a[href*="/status/"]')?.getAttribute('href') ?? '')
      const sourceId = url.split('/status/').at(1)?.split('?')[0] ?? 'unknown'
      const title =
        article.querySelector('[data-testid="tweetText"]')?.textContent?.trim() ??
        article.querySelector('[lang]')?.textContent?.trim() ??
        DEFAULT_TITLE
      const author =
        article.querySelector('[data-testid="User-Name"]')?.textContent?.trim() ??
        DEFAULT_AUTHOR
      const publishedAt =
        article.querySelector('time')?.getAttribute('datetime') ?? DEFAULT_PUBLISHED_AT
      const popularityScore = Number(
        article.querySelector('[data-retweets]')?.getAttribute('data-retweets') ?? '0'
      )

      return feedItemSchema.parse({
        id: `x:${sourceId}`,
        platform: 'x',
        title,
        summary: DEFAULT_SUMMARY,
        url,
        author,
        publishedAt,
        popularityScore,
        growthScore: 0,
        rawTags: ['x'],
        sourceId
      })
    })
}
