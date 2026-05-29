import type { FeedItem } from '@ai-hot/shared'

import type { BrowserSession } from '../../browser/session/createBrowserSession'
import { extractYouTubeItems } from './extractYouTubeItems'

const buildYouTubeSearchUrl = (query: string): string =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`

export const fetchYouTubeFeed = async (
  session: BrowserSession,
  searchQuery = 'AI artificial intelligence'
): Promise<FeedItem[]> => {
  const page = await session.openPage(buildYouTubeSearchUrl(searchQuery))

  await page.waitForSelector('ytd-rich-item-renderer')
  const html = await page.content()
  await page.close()

  return extractYouTubeItems(html)
}
