import { API_ROUTES } from '@ai-hot/shared'

import type { TodayFeed } from './fetchTodayFeed'

const COMPANION_SERVICE_ORIGIN = 'http://127.0.0.1:4317'

type CollectFeedResult = {
  success: boolean
  data: TodayFeed | null
  error: string | null
}

export const collectFeed = async (
  searchQuery: string,
  fetchImplementation: typeof fetch = fetch
): Promise<TodayFeed> => {
  const response = await fetchImplementation(`${COMPANION_SERVICE_ORIGIN}${API_ROUTES.collect}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ searchQuery })
  })

  if (!response.ok) {
    throw new Error('collect request failed')
  }

  const payload = (await response.json()) as CollectFeedResult

  if (!payload.success || !payload.data) {
    throw new Error(payload.error ?? 'collect request failed')
  }

  return payload.data
}