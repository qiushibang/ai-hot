import type { FeedItem } from '@ai-hot/shared'

import type { BrowserSession } from '../../browser/session/createBrowserSession'
import { parseXSearchTimeline } from './parseXSearchTimeline'

const RESPONSE_TIMEOUT_MS = 20_000

export const fetchXFeedViaCDP = async (
  session: BrowserSession,
  searchQuery = 'AI'
): Promise<FeedItem[]> => {
  const page = await session.newPage()

  try {
    const capturedBody = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        page.off('response', handler)
        reject(new Error(`SearchTimeline response timeout after ${RESPONSE_TIMEOUT_MS}ms`))
      }, RESPONSE_TIMEOUT_MS)

      const handler = async (response: { url: () => string; text: () => Promise<string> }) => {
        if (!response.url().includes('SearchTimeline')) return

        clearTimeout(timer)
        page.off('response', handler)

        try {
          resolve(await response.text())
        } catch (e) {
          reject(e)
        }
      }

      page.on('response', handler)

      const searchUrl = `https://x.com/search?q=${encodeURIComponent(searchQuery)}&src=typed_query&f=live`

      page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch((e) => {
        clearTimeout(timer)
        page.off('response', handler)
        reject(e)
      })
    })

    const payload = JSON.parse(capturedBody) as unknown

    return parseXSearchTimeline(payload)
  } finally {
    await page.close()
  }
}