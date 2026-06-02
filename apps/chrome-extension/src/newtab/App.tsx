import { createDefaultSettings, type Platform, type Settings } from '@ai-hot/shared'
import React, { useEffect, useMemo, useState } from 'react'

import { FeishuConfigModal } from './components/FeishuConfigModal'
import { FavoritesPanel } from './components/FavoritesPanel'
import { FilterBar } from './components/FilterBar'
import { PlatformSection } from './components/PlatformSection'
import { PushHistoryModal } from './components/PushHistoryModal'
import { WechatConfigModal } from './components/WechatConfigModal'
import { XAccountsConfigModal } from './components/XAccountsConfigModal'
import { createFavorite, deleteFavorite, fetchFavorites } from './lib/favorites'
import { fetchStatus, type ConnectionStatus } from './lib/fetchStatus'
import { fetchTodayFeed, type TodayFeed } from './lib/fetchTodayFeed'
import { collectFeed } from './lib/collectFeed'
import { addHistoryEntry } from './lib/pushHistory'
import { sendPush } from './lib/sendPush'
import { useTheme } from './lib/ThemeContext'

const PLATFORM_COLORS: Record<Platform, string> = {
  github: 'var(--color-platform-github)',
  x: 'var(--color-platform-x)',
  youtube: 'var(--color-platform-youtube)',
  huggingface: 'var(--color-platform-huggingface)'
}

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
    title: '今日 AI 热点',
    detail: '跨平台 AI 资讯聚合，实时抓取 · 一键推送',
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

// ── Styles ──

const page: React.CSSProperties = {
  minHeight: '100vh',
  padding: '32px',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-body)',
  transition: 'background 0.5s ease, color 0.5s ease'
}

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '32px',
  position: 'relative',
  zIndex: 1
}

const headerLeft: React.CSSProperties = {
  display: 'grid',
  gap: '6px'
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
  margin: 0,
  fontSize: 'clamp(28px, 4vw, 44px)',
  lineHeight: 1.08,
  fontWeight: 600,
  fontFamily: 'var(--font-display)',
  letterSpacing: '-0.01em'
}

const detail: React.CSSProperties = {
  margin: 0,
  maxWidth: '52ch',
  fontSize: '15px',
  lineHeight: 1.6,
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-body)'
}

const headerRight: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  flexShrink: 0
}

const statusRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
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
  padding: '5px 12px',
  borderRadius: '999px',
  background: 'var(--color-surface-raised)',
  fontSize: '11px',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  border: '1px solid var(--color-border)'
}

const statsBar: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  padding: '14px 20px',
  marginBottom: '28px',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  flexWrap: 'wrap'
}

const statItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px',
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-muted)'
}

const statDot: React.CSSProperties = {
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  flexShrink: 0
}

const statCount: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontWeight: 600,
  fontSize: '14px',
  color: 'var(--color-text)'
}

const statTotal: React.CSSProperties = {
  marginLeft: 'auto',
  fontFamily: 'var(--font-mono)',
  fontWeight: 600,
  fontSize: '18px',
  color: 'var(--color-accent)'
}

const bodyLayout: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  gap: '28px',
  alignItems: 'flex-start'
}

const contentArea: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
  gap: '18px'
}

const messageBar: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  marginBottom: '20px',
  padding: '10px 20px',
  borderRadius: 'var(--radius-md)',
  fontSize: '13px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 500,
  animation: 'fadeRise 0.3s ease both'
}

const successMsg: React.CSSProperties = {
  ...messageBar,
  background: 'rgba(63, 185, 80, 0.1)',
  border: '1px solid rgba(63, 185, 80, 0.25)',
  color: 'var(--color-success)'
}

const errorMsg: React.CSSProperties = {
  ...messageBar,
  background: 'rgba(240, 136, 62, 0.1)',
  border: '1px solid rgba(240, 136, 62, 0.2)',
  color: 'var(--color-error)'
}

const loadingPage: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-body)'
}

const loadingPanel: React.CSSProperties = {
  textAlign: 'center',
  maxWidth: '520px'
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
  const [collectResult, setCollectResult] = useState<{ total: number; platformCounts: { platform: Platform; label: string; count: number }[] } | null>(null)
  const [feishuConfigOpen, setFeishuConfigOpen] = useState(false)
  const [wechatConfigOpen, setWechatConfigOpen] = useState(false)
  const [xAccountsConfigOpen, setXAccountsConfigOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [favoritesPanelOpen, setFavoritesPanelOpen] = useState(false)
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

  const favoritedItems = useMemo(() => {
    if (!feed) return []

    return PLATFORM_ORDER.flatMap((p) =>
      feed[p].items.filter((item) => favoriteItemIds.includes(item.id))
    )
  }, [feed, favoriteItemIds])

  const togglePlatform = (platform: Platform) => {
    setEnabledPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    )
  }

  const handleCollect = async () => {
    const hasXAccounts = (settings.xTargetAccounts ?? []).length > 0
    if ((searchQuery.trim().length === 0 && !hasXAccounts) || isCollecting) return

    setIsCollecting(true)
    setHasFeedError(false)
    setCollectResult(null)
    setPushResult(null)
    try {
      const newFeed = await collectFeed(
        searchQuery.trim(),
        settings.xTargetAccounts,
        settings.xMaxPerAccount
      )
      setFeed(newFeed)

      const platformCounts = PLATFORM_ORDER
        .filter((p) => enabledPlatforms.includes(p))
        .map((p) => ({
          platform: p,
          label: PLATFORM_TITLES[p],
          count: (newFeed[p]?.items ?? []).length
        }))
        .filter((pc) => pc.count > 0)

      setCollectResult({
        total: platformCounts.reduce((sum, pc) => sum + pc.count, 0),
        platformCounts
      })
    } catch {
      setHasFeedError(true)
      setCollectResult(null)
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

  const handleFavoritePush = async (channel: 'feishu' | 'wechat') => {
    if (favoritedItems.length === 0 || isPushing) return

    setIsPushing(channel)
    setPushError(null)
    setPushResult(null)

    try {
      const result = await sendPush(channel, favoritedItems, '收藏箱')
      const count = result.sent ?? favoritedItems.length
      addHistoryEntry(channel, '收藏箱', count)
      setPushResult({ channel, count })
    } catch (error) {
      setPushError(error instanceof Error ? error.message : '推送失败')
    } finally {
      setIsPushing(null)
    }
  }

  const itemCount = visibleBuckets.reduce((sum, b) => sum + b.items.length, 0)

  // Loading / offline / error (no feed) — centered layout
  if (connectionStatus !== 'connected' || hasFeedError || !feed) {
    return (
      <>
        <div className="dot-grid-overlay" />
        <main style={loadingPage}>
          <div
            className={appeared ? 'stagger-1' : undefined}
            style={loadingPanel}
          >
            <p style={eyebrow}>{content.eyebrow}</p>
            <h1 style={{ ...title, marginTop: '12px' }}>{content.title}</h1>
            <p style={{ ...detail, marginTop: '10px' }}>{content.detail}</p>
            <div style={{ ...statusRow, justifyContent: 'center', marginTop: '24px' }}>
              <span style={dot} />
              <span style={badge}>{content.accentLabel}</span>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <div className="dot-grid-overlay" />
      <main style={page}>
        {/* Header */}
        <header className={appeared ? 'stagger-1' : undefined} style={header}>
          <div style={headerLeft}>
            <p style={eyebrow}>AI Hot</p>
            <h1 style={title}>今日 AI 热点</h1>
            <p style={detail}>跨平台 AI 资讯聚合，实时抓取 · 一键推送</p>
          </div>
          <div style={headerRight}>
            <div style={statusRow}>
              <span style={dot} />
              <span style={badge}>在线</span>
            </div>
            <button
              className="theme-toggle"
              type="button"
              aria-label={`切换到${theme === 'dark' ? '浅色' : '深色'}模式`}
              onClick={toggleTheme}
            />
          </div>
        </header>

        {/* Stats bar */}
        {visibleBuckets.length > 0 ? (
          <div className={appeared ? 'stagger-2' : undefined} style={statsBar}>
            {visibleBuckets.map((bucket) => (
              <span key={bucket.platform} style={statItem}>
                <span style={{ ...statDot, background: PLATFORM_COLORS[bucket.platform] }} />
                {bucket.title}
                {' '}
                <span style={statCount}>{bucket.items.length}</span>
              </span>
            ))}
            <span style={statTotal}>{itemCount} 条</span>
          </div>
        ) : null}

        {/* Messages */}
        {collectResult ? (
          <div className={appeared ? 'stagger-2' : undefined} style={successMsg}>
            &#10003; 抓取完成，共 {collectResult.total} 条
            {collectResult.platformCounts.length > 0
              ? `（${collectResult.platformCounts.map((pc) => `${pc.label} ${pc.count}`).join(' · ')}）`
              : ''}
          </div>
        ) : null}
        {favoritesError ? (
          <div className={appeared ? 'stagger-2' : undefined} style={errorMsg}>{favoritesError}</div>
        ) : null}
        {pushError ? (
          <div className={appeared ? 'stagger-2' : undefined} style={errorMsg}>{pushError}</div>
        ) : null}
        {pushResult ? (
          <div className={appeared ? 'stagger-2' : undefined} style={successMsg}>
            &#10003; 已推送 {pushResult.count} 条到{pushResult.channel === 'feishu' ? '飞书' : '微信'}
          </div>
        ) : null}

        {/* Body: sidebar + content */}
        <div style={bodyLayout}>
          <div className={appeared ? 'stagger-3' : undefined}>
            <FilterBar
              enabledPlatforms={enabledPlatforms}
              isCollecting={isCollecting}
              searchQuery={searchQuery}
              isFeishuConfigured={isFeishuConfigured}
              wechatWebhookUrl={settings.wechatWebhookUrl}
              xTargetAccounts={settings.xTargetAccounts ?? []}
              itemCount={itemCount}
              isPushing={isPushing}
              onCollect={handleCollect}
              onPushFeishu={() => void handlePush('feishu')}
              onPushWechat={() => void handlePush('wechat')}
              onOpenFeishuConfig={() => setFeishuConfigOpen(true)}
              onOpenWechatConfig={() => setWechatConfigOpen(true)}
              onOpenPushHistory={() => setHistoryOpen(true)}
              onOpenXAccountsConfig={() => setXAccountsConfigOpen(true)}
              onOpenFavorites={() => setFavoritesPanelOpen(true)}
              favoritesCount={favoritedItems.length}
              onSearchChange={setSearchQuery}
              onTogglePlatform={togglePlatform}
            />
          </div>

          <div style={contentArea}>
            {visibleBuckets.map((bucket, i) => (
              <div
                key={bucket.platform}
                className={appeared ? `stagger-${Math.min(i + 4, 6)}` : undefined}
                style={{ animationName: 'slideInRight' }}
              >
                <PlatformSection
                  platform={bucket.platform}
                  favoriteItemIds={favoriteItemIds}
                  title={bucket.title}
                  items={bucket.items}
                  message={bucket.message}
                  state={bucket.state}
                  onFavorite={async (itemId) => {
                    const isFavorited = favoriteItemIds.includes(itemId)
                    try {
                      if (isFavorited) {
                        await deleteFavorite(itemId)
                        setFavoriteItemIds((prev) => prev.filter((id) => id !== itemId))
                      } else {
                        const fav = await createFavorite(itemId)
                        setFavoriteItemIds((prev) =>
                          prev.includes(fav.itemId) ? prev : [...prev, fav.itemId]
                        )
                      }
                      setFavoritesError(null)
                    } catch {
                      setFavoritesError('Unable to update favorite.')
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
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
      {xAccountsConfigOpen ? (
        <XAccountsConfigModal
          open={xAccountsConfigOpen}
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setXAccountsConfigOpen(false)}
        />
      ) : null}
      {historyOpen ? (
        <PushHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
      ) : null}
      {favoritesPanelOpen ? (
        <FavoritesPanel
          open={favoritesPanelOpen}
          items={favoritedItems}
          isPushing={isPushing}
          onClose={() => setFavoritesPanelOpen(false)}
          onPushFeishu={() => void handleFavoritePush('feishu')}
          onPushWechat={() => void handleFavoritePush('wechat')}
          onUnfavorite={async (itemId) => {
            try {
              await deleteFavorite(itemId)
              setFavoriteItemIds((prev) => prev.filter((id) => id !== itemId))
              setFavoritesError(null)
            } catch {
              setFavoritesError('Unable to remove favorite.')
            }
          }}
        />
      ) : null}
    </>
  )
}