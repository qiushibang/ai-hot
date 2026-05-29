import {
  API_ROUTES,
  type FeedItem,
  type Platform,
  type PlatformCollectionState
} from '@ai-hot/shared'

const COMPANION_SERVICE_ORIGIN = 'http://127.0.0.1:4317'

type FeedBucket = {
  items: FeedItem[]
  message: string | null
  state: PlatformCollectionState
}

export type TodayFeed = Record<Platform, FeedBucket>

type FeedPayload = {
  success: boolean
  data: TodayFeed | null
  error: string | null
}

export const fetchTodayFeed = async (
  fetchImplementation: typeof fetch = fetch
): Promise<TodayFeed> => {
  const response = await fetchImplementation(`${COMPANION_SERVICE_ORIGIN}${API_ROUTES.todayFeed}`)

  if (!response.ok) {
    throw new Error('feed request failed')
  }

  const payload = (await response.json()) as FeedPayload

  if (!payload.success || !payload.data) {
    throw new Error(payload.error ?? 'feed request failed')
  }

  return payload.data
}
