import { API_ROUTES, type FeedItem } from '@ai-hot/shared'

const COMPANION_SERVICE_ORIGIN = 'http://127.0.0.1:4317'

type PushResult = {
  success: boolean
  data: { delivered: boolean; sent?: number } | null
  error: string | null
}

export const sendPush = async (
  channel: 'feishu' | 'wechat',
  items: FeedItem[],
  searchQuery: string,
  fetchImplementation: typeof fetch = fetch
): Promise<{ delivered: boolean; sent?: number }> => {
  const route = channel === 'feishu' ? API_ROUTES.pushFeishu : API_ROUTES.pushWechat

  const response = await fetchImplementation(`${COMPANION_SERVICE_ORIGIN}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, searchQuery })
  })

  if (!response.ok) {
    const payload = (await response.json()) as PushResult

    throw new Error(payload.error ?? 'push request failed')
  }

  const payload = (await response.json()) as PushResult

  if (!payload.success || !payload.data) {
    throw new Error(payload.error ?? 'push request failed')
  }

  return payload.data
}