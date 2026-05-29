import {
  API_ROUTES,
  createDefaultSettings,
  settingsSchema,
  type PlatformStatus,
  type Settings
} from '@ai-hot/shared'
import React, { useEffect, useState } from 'react'

const COMPANION_SERVICE_ORIGIN = 'http://127.0.0.1:4317'

const SETTINGS_URL = `${COMPANION_SERVICE_ORIGIN}${API_ROUTES.settings}`
const PLATFORM_STATUS_URL = `${COMPANION_SERVICE_ORIGIN}${API_ROUTES.platformStatuses}`

type SettingsPayload = {
  success: boolean
  data: Settings | null
  error: string | null
}

type PlatformStatusesPayload = {
  success: boolean
  data: PlatformStatus[] | null
  error: string | null
}

const PAGE_STYLES = {
  page: {
    minHeight: '100vh',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    background:
      'radial-gradient(circle at top, rgba(105, 134, 255, 0.16), transparent 32%), linear-gradient(135deg, #07111f 0%, #0f1728 55%, #1a1f38 100%)',
    color: '#f4efe5',
    fontFamily: 'Avenir Next, Helvetica Neue, sans-serif'
  },
  panel: {
    width: 'min(640px, 100%)',
    display: 'grid',
    gap: '18px',
    padding: '32px',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(8, 12, 22, 0.82)',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.35)'
  },
  title: {
    margin: 0,
    fontSize: '32px',
    fontFamily: 'Iowan Old Style, Georgia, serif'
  },
  detail: {
    margin: 0,
    color: 'rgba(244, 239, 229, 0.72)',
    lineHeight: 1.6
  },
  label: {
    display: 'grid',
    gap: '8px',
    fontSize: '14px'
  },
  input: {
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '14px',
    padding: '12px 14px',
    background: 'rgba(7, 17, 31, 0.72)',
    color: '#f4efe5',
    fontSize: '14px'
  },
  button: {
    border: 'none',
    borderRadius: '999px',
    padding: '12px 18px',
    background: '#7cf29a',
    color: '#07111f',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  message: {
    margin: 0,
    fontSize: '14px'
  },
  error: {
    color: '#ffcf70'
  },
  success: {
    color: '#7cf29a'
  },
  statusPanel: {
    display: 'grid',
    gap: '10px',
    padding: '18px 20px',
    borderRadius: '18px',
    background: 'rgba(7, 17, 31, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  statusTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600
  },
  statusList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gap: '8px'
  },
  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    fontSize: '14px',
    color: 'rgba(244, 239, 229, 0.78)'
  },
  statusLabel: {
    color: '#ffcf70'
  }
}

const STATUS_LABELS: Record<PlatformStatus['state'], string> = {
  ready: '已就绪',
  no_results: '今日结果较少',
  browser_unavailable: 'Chrome 不可用',
  profile_unavailable: 'Profile 不可用',
  not_logged_in: '未登录',
  session_busy: '会话繁忙',
  parse_failed: '抓取失败',
  platform_unavailable: '平台不可用'
}

const readSettingsPayload = async (response: Response): Promise<SettingsPayload> => {
  return (await response.json()) as SettingsPayload
}

const readPlatformStatusesPayload = async (
  response: Response
): Promise<PlatformStatusesPayload> => {
  return (await response.json()) as PlatformStatusesPayload
}

export const OptionsApp = () => {
  const [settings, setSettings] = useState<Settings>(createDefaultSettings())
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const loadSettings = async () => {
      try {
        const [settingsResponse, platformStatusesResponse] = await Promise.all([
          fetch(SETTINGS_URL),
          fetch(PLATFORM_STATUS_URL)
        ])
        const [settingsPayload, platformStatusesPayload] = await Promise.all([
          readSettingsPayload(settingsResponse),
          readPlatformStatusesPayload(platformStatusesResponse)
        ])

        if (!settingsResponse.ok || !settingsPayload.success || !settingsPayload.data) {
          throw new Error(settingsPayload.error ?? 'settings request failed')
        }

        if (
          !platformStatusesResponse.ok ||
          !platformStatusesPayload.success ||
          !platformStatusesPayload.data
        ) {
          throw new Error(platformStatusesPayload.error ?? 'platform status request failed')
        }

        if (!isActive) {
          return
        }

        setSettings(settingsSchema.parse(settingsPayload.data))
        setPlatformStatuses(platformStatusesPayload.data)
        setErrorMessage(null)
        setHasLoaded(true)
      } catch {
        if (!isActive) {
          return
        }

        setErrorMessage('暂时无法加载设置。')
      }
    }

    void loadSettings()

    return () => {
      isActive = false
    }
  }, [])

  const updateSetting = (field: keyof Settings, value: string) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value.trim() === '' ? null : value
    }))
    setSuccessMessage(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const response = await fetch(SETTINGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      const payload = await readSettingsPayload(response)

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'settings request failed')
      }

      setSettings(settingsSchema.parse(payload.data))
      setErrorMessage(null)
      setSuccessMessage('设置已保存。')
      setHasLoaded(true)
    } catch {
      setErrorMessage('暂时无法保存设置。')
      setSuccessMessage(null)
    }
  }

  return (
    <main style={PAGE_STYLES.page}>
      <section style={PAGE_STYLES.panel}>
        <h1 style={PAGE_STYLES.title}>推送设置</h1>
        <p style={PAGE_STYLES.detail}>配置飞书和企业微信推送，支持 Webhook 和开放平台 API 两种方式。</p>
        {errorMessage ? (
          <p style={{ ...PAGE_STYLES.message, ...PAGE_STYLES.error }}>{errorMessage}</p>
        ) : null}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={PAGE_STYLES.label}>
              飞书 Webhook（备选）
              <input
                aria-label="飞书 Webhook"
                style={PAGE_STYLES.input}
                value={settings.feishuWebhookUrl ?? ''}
                onChange={(event) => updateSetting('feishuWebhookUrl', event.target.value)}
              />
            </label>
            <label style={PAGE_STYLES.label}>
              飞书 App ID
              <input
                aria-label="飞书 App ID"
                style={PAGE_STYLES.input}
                value={settings.feishuAppId ?? ''}
                onChange={(event) => updateSetting('feishuAppId', event.target.value)}
              />
            </label>
            <label style={PAGE_STYLES.label}>
              飞书 App Secret
              <input
                aria-label="飞书 App Secret"
                style={PAGE_STYLES.input}
                type="password"
                value={settings.feishuAppSecret ?? ''}
                onChange={(event) => updateSetting('feishuAppSecret', event.target.value)}
              />
            </label>
            <label style={PAGE_STYLES.label}>
              飞书 Receive ID
              <input
                aria-label="飞书 Receive ID"
                style={PAGE_STYLES.input}
                placeholder="例如 oc_xxx（群聊）或 ou_xxx（私聊）"
                value={settings.feishuReceiveId ?? ''}
                onChange={(event) => updateSetting('feishuReceiveId', event.target.value)}
              />
            </label>
            <label style={PAGE_STYLES.label}>
              企业微信 Webhook
              <input
                aria-label="企业微信 Webhook"
                style={PAGE_STYLES.input}
                value={settings.wechatWebhookUrl ?? ''}
                onChange={(event) => updateSetting('wechatWebhookUrl', event.target.value)}
              />
            </label>
            <button style={PAGE_STYLES.button} type="submit" disabled={!hasLoaded}>
              保存设置
            </button>
          </div>
        </form>
        {successMessage ? (
          <p style={{ ...PAGE_STYLES.message, ...PAGE_STYLES.success }}>{successMessage}</p>
        ) : null}
        <section style={PAGE_STYLES.statusPanel}>
          <h2 style={PAGE_STYLES.statusTitle}>平台状态</h2>
          <ul style={PAGE_STYLES.statusList}>
            {platformStatuses.map((platformStatus) => (
              <li key={platformStatus.platform} style={PAGE_STYLES.statusItem}>
                <span>{platformStatus.platform}</span>
                <span style={PAGE_STYLES.statusLabel}>
                  {platformStatus.detail ?? STATUS_LABELS[platformStatus.state]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  )
}
