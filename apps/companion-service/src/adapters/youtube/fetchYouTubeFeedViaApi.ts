import type { FeedItem } from '@ai-hot/shared'

import type { AuthFetchFunction } from '../../feed/cookieAuthFetcher'
import { parseYouTubeSearchResponse } from './parseYouTubeSearchResponse'

const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'
const INNERTUBE_SEARCH_URL = `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_API_KEY}`

export const fetchYouTubeFeedViaApi = async (
  authFetch: AuthFetchFunction,
  searchQuery = 'AI artificial intelligence'
): Promise<FeedItem[]> => {
  const body = {
    context: {
      client: {
        hl: 'en',
        gl: 'US',
        clientName: 'WEB',
        clientVersion: '2.20250521.00.00'
      }
    },
    query: searchQuery,
    params: 'EgQIBRAB'
  }

  const response = await authFetch(INNERTUBE_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error('youtube feed request failed')
  }

  const payload = (await response.json()) as unknown

  return parseYouTubeSearchResponse(payload)
}