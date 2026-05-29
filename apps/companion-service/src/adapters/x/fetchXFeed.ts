import type { FeedItem } from '@ai-hot/shared'

import type { BrowserSession } from '../../browser/session/createBrowserSession'
import { extractXItems } from './extractXItems'

const buildXSearchUrl = (query: string): string =>
  `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`

export const fetchXFeed = async (
  session: BrowserSession,
  searchQuery = 'AI'
): Promise<FeedItem[]> => {
  const page = await session.openPage(buildXSearchUrl(searchQuery))

  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(3000)
  await page.mouse.move(100, 200)
  await page.waitForTimeout(2000)
  await page.evaluate(() => window.scrollTo(0, 500))
  await page.waitForTimeout(2000)

  const html = await page.content()
  await page.close()

  const items = extractXItems(html)

  if (items.length === 0) {
    const snippet = html.slice(0, 1000).replace(/\n/g, ' ')
    throw new Error(`x search page returned no matching articles. HTML preview: ${snippet}`)
  }

  return items
}
