import type { Settings } from '@ai-hot/shared'

const COMPANION_SERVICE_ORIGIN = 'http://127.0.0.1:4317'

type SettingsPayload = {
  success: boolean
  data: Settings | null
  error: string | null
}

export const saveSettings = async (settings: Settings): Promise<Settings> => {
  const response = await fetch(`${COMPANION_SERVICE_ORIGIN}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })

  const payload = (await response.json()) as SettingsPayload

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error ?? 'settings save failed')
  }

  return payload.data
}