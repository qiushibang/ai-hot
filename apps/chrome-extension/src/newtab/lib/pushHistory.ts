const STORAGE_KEY = 'ai-hot-push-history'

export type PushHistoryEntry = {
  id: string
  channel: 'feishu' | 'wechat'
  searchQuery: string
  itemCount: number
  createdAt: string
}

export const loadHistory = (): PushHistoryEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (raw) return JSON.parse(raw) as PushHistoryEntry[]
  } catch {
    // ignore
  }

  return []
}

export const addHistoryEntry = (
  channel: 'feishu' | 'wechat',
  searchQuery: string,
  itemCount: number
): PushHistoryEntry[] => {
  const history = loadHistory()
  const entry: PushHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    channel,
    searchQuery: searchQuery || '热点',
    itemCount,
    createdAt: new Date().toISOString()
  }

  history.unshift(entry)

  // Keep last 100 entries
  const trimmed = history.slice(0, 100)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // ignore
  }

  return trimmed
}

export const clearHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}