import { API_ROUTES } from '@ai-hot/shared'

const COMPANION_SERVICE_ORIGIN = 'http://127.0.0.1:4317'
const PREVIEW_MODE_QUERY_KEY = 'preview'
const STATUS_REQUEST_TIMEOUT_MS = 2000

export type ConnectionStatus = 'loading' | 'connected' | 'offline'

const getPreviewConnectionStatus = (): Exclude<ConnectionStatus, 'loading'> | null => {
  const previewMode = new URLSearchParams(window.location.search).get(PREVIEW_MODE_QUERY_KEY)

  if (previewMode === 'connected' || previewMode === 'offline') {
    return previewMode
  }

  return null
}

export const fetchStatus = async (): Promise<ConnectionStatus> => {
  const previewConnectionStatus = getPreviewConnectionStatus()

  if (previewConnectionStatus) {
    return previewConnectionStatus
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => {
    controller.abort()
  }, STATUS_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${COMPANION_SERVICE_ORIGIN}${API_ROUTES.status}`, {
      signal: controller.signal
    })

    if (!response.ok) {
      return 'offline'
    }

    return 'connected'
  } catch {
    return 'offline'
  } finally {
    window.clearTimeout(timeoutId)
  }
}
