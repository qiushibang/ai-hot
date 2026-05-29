import { createDefaultSettings, type Platform, type Settings } from '@ai-hot/shared'
import React, { useEffect, useMemo, useState } from 'react'

import { FeishuConfigModal } from './components/FeishuConfigModal'
import { FilterBar } from './components/FilterBar'
import { PlatformSection } from './components/PlatformSection'
import { PushHistoryModal } from './components/PushHistoryModal'
import { WechatConfigModal } from './components/WechatConfigModal'
import { createFavorite, fetchFavorites } from './lib/favorites'
import { fetchStatus, type ConnectionStatus } from './lib/fetchStatus'
import { fetchTodayFeed, type TodayFeed } from './lib/fetchTodayFeed'
import { collectFeed } from './lib/collectFeed'
import { addHistoryEntry } from './lib/pushHistory'
import { sendPush } from './lib/sendPush'
import { useTheme } from './lib/ThemeContext'

const STATUS_CONTENT: Record<
  ConnectionStatus,
  { eyebrow: string; title: string; detail: string; accentLabel: string }
> = {
  loading: {
    eyebrow: 'AI Hot',
    title: '正在连接本地服务…',
    detail: '正在查找 companion service at http://127.0.0.1:4317',
    accentLabel: '启动中'
  },
  connected: {
    eyebrow: 'AI Hot',
    title: '已连接到本地服务',
    detail: '输入主题词，抓取今日 AI 热点，推送到飞书或微信。',
    accentLabel: '在线'
  },
  offline: {
    eyebrow: 'AI Hot',
    title: '服务离线',
    detail: '请启动 companion service at http://127.0.0.1:4317',
    accentLabel: '离线'
  }
}

const FEED_ERROR_CONTENT = {
  eyebrow: 'AI Hot',
  title: '无法加载今日内容',
  detail: '请检查 companion service 是否正常运行后重试。',
  accentLabel: '重试'
}

const PLATFORM_TITLES: Record<Platform, string> = {
  github: 'GitHub',
  x: 'X / Twitter',
  youtube: 'YouTube',
  huggingface: 'Hugging Face'
}

const PLATFORM_ORDER: Platform[] = ['github', 'x', 'youtube', 'huggingface']
const DEFAULT_ENABLED_PLATFORMS: Platform[] = [...PLATFORM_ORDER]

type AppProps = {
  fetchStatus?: () => Promise<ConnectionStatus>
  loadTodayFeed?: () => Promise<TodayFeed>
  loadSettings?: () => Promise<Settings>
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'clamp(20px, 4vw, 40px)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-body)',
  transition: 'background 0.5s ease, color 0.5s ease'
}

const panel: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: 'min(100%, 1440px)',
  padding: 'clamp(32px, 5vw, 56px)',
  borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  transition: 'background 0.5s ease, border 0.5s ease'
}

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: '11px',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)'
}

const title: React.CSSProperties = {
  margin: '14px 0 12px',
  fontSize: 'clamp(32px, 5vw, 52px)',
  lineHeight: 1.08,
  fontWeight: 600,
  fontFamily: 'var(--font-display)',
  letterSpacing: '-0.01em'
}

const detail: React.CSSProperties = {
  margin: 0,
  maxWidth: '48ch',
  fontSize: '16px',
  lineHeight: 1.65,
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-body)'
}

const headerRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px'
}

const statusRow: React.CSSProperties = {
  marginTop: '28px',
  display: 'flex',
  alignItems: 'center',
  gap: '14px'
}

const dot: React.CSSProperties = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  background: 'var(--color-dot)',
  animation: 'breathe 2.2s ease-in-out infinite'
}

const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '7px 14px',
  borderRadius: '999px',
  background: 'var(--color-surface-raised)',
  fontSize: '12px',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  border: '1px solid var(--color-border)',
  transition: 'background 0.5s ease, border 0.5s ease'
}

const sections: React.CSSProperties = {
  marginTop: '40px',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '18px'
}

const inlineError: React.CSSProperties = {
  margin: '16px 0 0',
  fontSize: '14px',
  lineHeight: 1.6,
  color: 'var(--color-error)',
  fontFamily: 'var(--font-body)'
}

const inlineSuccess: React.CSSProperties = {
  margin: '16px 0 0',
  fontSize: '14px',
  lineHeight: 1.6,
  color: 'var(--color-success)',
  fontFamily: 'var(--font-body)'
}

const fetchSettings = async () => {
  const response = await fetch('http://127.0.0.1:4317/api/settings')
  const payload = (await response.json()) as { success: boolean; data: Settings | null; error: string | null }

  if (!payload.success || !payload.data) {
    return createDefaultSettings()
  }

  return payload.data
}

export const App = ({
  fetchStatus: loadStatus = fetchStatus,
  loadTodayFeed = fetchTodayFeed,
  loadSettings = fetchSettings
}: AppProps) => {
  const { theme, toggleTheme } = useTheme()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('loading')
  const [feed, setFeed] = useState<TodayFeed | null>(null)
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([])
  const [favoritesError, setFavoritesError] = useState<string | null>(null)
  const [hasFeedError, setHasFeedError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCollecting, setIsCollecting] = useState(false)
  const [enabledPlatforms, setEnabledPlatforms] = useState<Platform[]>(DEFAULT_ENABLED_PLATFORMS)
  const [settings, setSettings] = useState<Settings>(createDefaultSettings())
  const [isPushing, setIsPushing] = useState<'feishu' | 'wechat' | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)
  const [pushResult, setPushResult] = useState<{ channel: string; count: number } | null>(null)
  const [feishuConfigOpen, setFeishuConfigOpen] = useState(false)
  const [wechatConfigOpen, setWechatConfigOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [appeared, setAppeared] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAppeared(true), 60)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    let isActive = true

    const loadAppState = async () => {
      const nextStatus = await loadStatus()

      if (!isActive) return

      setConnectionStatus(nextStatus)

      if (nextStatus !== 'connected' || !loadTodayFeed) return

      const [feedResult, favoritesResult, settingsResult] = await Promise.allSettled([
        loadTodayFeed(),
        fetchFavorites(),
        loadSettings()
      ])

      if (!isActive) return

      if (feedResult.status === 'fulfilled' && feedResult.value) {
        setFeed(feedResult.value)
        setHasFeedError(false)
      } else if (feedResult.status === 'rejected') {
        setFeed(null)
        setHasFeedError(true)
      }

      if (favoritesResult.status === 'fulfilled') {
        setFavoriteItemIds(favoritesResult.value.map((f) => f.itemId))
        setFavoritesError(null)
      } else {
        setFavoriteItemIds([])
        setFavoritesError('Unable to load favorites right now.')
      }

      if (settingsResult.status === 'fulfilled') {
        setSettings(settingsResult.value)
      }
    }

    void loadAppState()

    return () => {
      isActive = false
    }
  }, [loadStatus, loadTodayFeed])

  const content = hasFeedError ? FEED_ERROR_CONTENT : STATUS_CONTENT[connectionStatus]

  const visibleBuckets = useMemo(() => {
    if (!feed) return []

    return PLATFORM_ORDER.flatMap((platform) => {
      if (!enabledPlatforms.includes(platform)) return []

      const bucket = feed[platform]
      if (bucket.items.length === 0 && !bucket.message) return []

      return [{ platform, title: PLATFORM_TITLES[platform], ...bucket }]
    })
  }, [enabledPlatforms, feed])

  const isFeishuConfigured = useMemo(
    () =>
      !!(
        settings.feishuWebhookUrl ||
        (settings.feishuAppId && settings.feishuAppSecret && settings.feishuReceiveId)
      ),
    [settings]
  )

  const togglePlatform = (platform: Platform) => {
    setEnabledPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    )
  }

  const handleCollect = async () => {
    if (searchQuery.trim().length === 0 || isCollecting) return

    setIsCollecting(true)
    setHasFeedError(false)
    try {
      setFeed(await collectFeed(searchQuery.trim()))
    } catch {
      setHasFeedError(true)
    } finally {
      setIsCollecting(false)
    }
  }

  const handlePush = async (channel: 'feishu' | 'wechat') => {
    if (!feed || isPushing) return

    setIsPushing(channel)
    setPushError(null)
    setPushResult(null)

    try {
      const allItems = enabledPlatforms.flatMap((p) => feed[p].items)
      const result = await sendPush(channel, allItems, searchQuery)
      const count = result.sent ?? allItems.length
      addHistoryEntry(channel, searchQuery, count)
      setPushResult({ channel, count })
    } catch (error) {
      setPushError(error instanceof Error ? error.message : '推送失败')
    } finally {
      setIsPushing(null)
    }
  }

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings)
    setPushError(null)
  }

  const itemCount = visibleBuckets.reduce((sum, b) => sum + b.items.length, 0)

  return (
    <>
      <div className="grain-overlay" />
      <main style={page}>
        <section style={panel}>
          <div className={appeared ? 'stagger-1' : undefined} style={headerRow}>
            <div>
              <p style={eyebrow}>{content.eyebrow}</p>
              <h1 style={title}>{content.title}</h1>
              <p style={detail}>{content.detail}</p>
            </div>
            <button
              className="theme-toggle"
              type="button"
              aria-label={`切换到${theme === 'dark' ? '浅色' : '深色'}模式`}
              onClick={toggleTheme}
            />
          </div>

          <div className={appeared ? 'stagger-2' : undefined} style={statusRow}>
            <span style={dot} />
            <span style={badge}>{content.accentLabel}</span>
          </div>

          {connectionStatus === 'connected' && !hasFeedError && feed ? (
            <>
              <div className={appeared ? 'stagger-3' : undefined}>
                <FilterBar
                  enabledPlatforms={enabledPlatforms}
                  isCollecting={isCollecting}
                  searchQuery={searchQuery}
                  isFeishuConfigured={isFeishuConfigured}
                  wechatWebhookUrl={settings.wechatWebhookUrl}
                  itemCount={itemCount}
                  isPushing={isPushing}
                  onCollect={handleCollect}
                  onPushFeishu={() => void handlePush('feishu')}
                  onPushWechat={() => void handlePush('wechat')}
                  onOpenFeishuConfig={() => setFeishuConfigOpen(true)}
                  onOpenWechatConfig={() => setWechatConfigOpen(true)}
                  onOpenPushHistory={() => setHistoryOpen(true)}
                  onSearchChange={setSearchQuery}
                  onTogglePlatform={togglePlatform}
                />
              </div>

              {favoritesError ? <p style={inlineError}>{favoritesError}</p> : null}
              {pushError ? <p style={inlineError}>{pushError}</p> : null}
              {pushResult ? (
                <p style={inlineSuccess}>
                  &#10003; 已推送 {pushResult.count} 条到{pushResult.channel === 'feishu' ? '飞书' : '微信'}
                </p>
              ) : null}
            </>
          ) : null}

          {connectionStatus === 'connected' && !hasFeedError && visibleBuckets.length > 0 ? (
            <div style={sections}>
              {visibleBuckets.map((bucket, i) => (
                <div
                  key={bucket.platform}
                  className={appeared ? `stagger-${Math.min(i + 4, 6)}` : undefined}
                >
                  <PlatformSection
                    favoriteItemIds={favoriteItemIds}
                    title={bucket.title}
                    items={bucket.items}
                    message={bucket.message}
                    state={bucket.state}
                    onFavorite={async (itemId) => {
                      try {
                        const fav = await createFavorite(itemId)
                        setFavoriteItemIds((prev) =>
                          prev.includes(fav.itemId) ? prev : [...prev, fav.itemId]
                        )
                        setFavoritesError(null)
                      } catch {
                        setFavoritesError('Unable to save that favorite right now.')
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </main>

      {feishuConfigOpen ? (
        <FeishuConfigModal
          open={feishuConfigOpen}
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setFeishuConfigOpen(false)}
        />
      ) : null}
      {wechatConfigOpen ? (
        <WechatConfigModal
          open={wechatConfigOpen}
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setWechatConfigOpen(false)}
        />
      ) : null}
      {historyOpen ? (
        <PushHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
      ) : null}
    </>
  )
}