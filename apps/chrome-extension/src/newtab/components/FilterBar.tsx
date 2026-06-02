import type { Platform } from '@ai-hot/shared'
import React from 'react'

/* eslint-disable no-unused-vars */
type FilterBarProps = {
  enabledPlatforms: Platform[]
  searchQuery: string
  isCollecting: boolean
  isFeishuConfigured: boolean
  wechatWebhookUrl: string | null
  xTargetAccounts: string[]
  itemCount: number
  isPushing: 'feishu' | 'wechat' | null
  onSearchChange: (value: string) => void
  onCollect: () => void
  onPushFeishu: () => void
  onPushWechat: () => void
  onOpenFeishuConfig: () => void
  onOpenWechatConfig: () => void
  onOpenPushHistory: () => void
  onOpenXAccountsConfig: () => void
  onOpenFavorites: () => void
  favoritesCount: number
  onTogglePlatform: (platform: Platform) => void
}
/* eslint-enable no-unused-vars */

const PLATFORM_OPTIONS: { label: string; platform: Platform; color: string }[] = [
  { label: 'GitHub', platform: 'github', color: 'var(--color-platform-github)' },
  { label: 'X', platform: 'x', color: 'var(--color-platform-x)' },
  { label: 'YouTube', platform: 'youtube', color: 'var(--color-platform-youtube)' },
  { label: 'Hugging Face', platform: 'huggingface', color: 'var(--color-platform-huggingface)' }
]

const sidebar: React.CSSProperties = {
  width: '280px',
  flexShrink: 0,
  position: 'sticky',
  top: '24px',
  alignSelf: 'flex-start',
  display: 'grid',
  gap: '20px'
}

const section: React.CSSProperties = {
  padding: '20px',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)'
}

const sectionLabel: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: '10px',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)'
}

const input: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 14px',
  background: 'var(--color-surface-raised)',
  color: 'var(--color-text)',
  fontSize: '13px',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  transition: 'border 0.2s ease'
}

const collectBtn: React.CSSProperties = {
  width: '100%',
  marginTop: '10px',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 0',
  background: 'var(--color-accent)',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  letterSpacing: '0.03em',
  transition: 'opacity 0.25s ease'
}

const platformChips: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
}

const chipBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-raised)',
  cursor: 'pointer',
  fontSize: '13px',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  transition: 'all 0.2s ease',
  userSelect: 'none'
}

const chipDot: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  flexShrink: 0,
  transition: 'box-shadow 0.2s ease'
}

const pushBtn: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: '9px 0',
  background: 'transparent',
  color: 'var(--color-text)',
  fontSize: '13px',
  fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  letterSpacing: '0.02em',
  transition: 'border 0.2s ease, opacity 0.2s ease',
  marginBottom: '8px'
}

const configBtn: React.CSSProperties = {
  display: 'block',
  width: '100%',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  padding: '7px 12px',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  fontSize: '12px',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'color 0.2s ease, background 0.2s ease'
}

const xIndicator: React.CSSProperties = {
  display: 'inline-block',
  marginLeft: '4px',
  padding: '1px 7px',
  borderRadius: '999px',
  background: 'var(--color-accent-soft)',
  color: 'var(--color-accent)',
  fontSize: '10px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 600
}

const favoritesBtn: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-accent)',
  background: 'var(--color-accent-soft)',
  color: 'var(--color-accent)',
  fontSize: '13px',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  cursor: 'pointer',
  letterSpacing: '0.02em',
  transition: 'opacity 0.2s ease, background 0.2s ease'
}

const favoritesCountBadge: React.CSSProperties = {
  marginLeft: 'auto',
  padding: '2px 8px',
  borderRadius: '999px',
  background: 'var(--color-accent)',
  color: '#fff',
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 600
}

const searchHint: React.CSSProperties = {
  marginTop: '8px',
  fontSize: '11px',
  lineHeight: 1.4,
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-body)'
}

export const FilterBar = ({
  enabledPlatforms,
  searchQuery,
  isCollecting,
  isFeishuConfigured,
  wechatWebhookUrl,
  xTargetAccounts,
  itemCount,
  isPushing,
  onSearchChange,
  onCollect,
  onPushFeishu,
  onPushWechat,
  onOpenFeishuConfig,
  onOpenWechatConfig,
  onOpenPushHistory,
  onOpenXAccountsConfig,
  onOpenFavorites,
  favoritesCount,
  onTogglePlatform
}: FilterBarProps) => {
  const pushDisabled = itemCount === 0 || isPushing !== null
  const hasXAccounts = xTargetAccounts.length > 0
  const canCollect = searchQuery.trim().length > 0 || hasXAccounts

  return (
    <aside style={sidebar}>
      {/* Search + Collect */}
      <div style={section}>
        <p style={sectionLabel}>
          {hasXAccounts ? '主题搜索（可选）' : '主题搜索'}
        </p>
        <input
          style={input}
          value={searchQuery}
          placeholder={
            hasXAccounts
              ? '进一步筛选关键词…'
              : '输入主题词，如 AI agent…'
          }
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCollect()
          }}
        />
        <button
          disabled={isCollecting || !canCollect}
          style={{
            ...collectBtn,
            opacity: isCollecting || !canCollect ? 0.4 : 1
          }}
          type="button"
          onClick={onCollect}
        >
          {isCollecting ? '抓取中…' : '抓取'}
        </button>
        {hasXAccounts ? (
          <p style={searchHint}>
            已配置 {xTargetAccounts.length} 个 X 账号，留空则抓取全部
          </p>
        ) : null}
      </div>

      {/* Platform filter chips */}
      <div style={section}>
        <p style={sectionLabel}>平台筛选</p>
        <div style={platformChips}>
          {PLATFORM_OPTIONS.map(({ label, platform, color }) => {
            const active = enabledPlatforms.includes(platform)

            return (
              <div
                key={platform}
                style={{
                  ...chipBase,
                  borderColor: active ? color : 'var(--color-border)',
                  color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                  background: active ? 'var(--color-surface)' : 'var(--color-surface-raised)'
                }}
                role="checkbox"
                aria-checked={active}
                aria-label={`${label} 平台`}
                tabIndex={0}
                onClick={() => onTogglePlatform(platform)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onTogglePlatform(platform)
                  }
                }}
              >
                <span
                  style={{
                    ...chipDot,
                    background: active ? color : 'var(--color-border-strong)',
                    boxShadow: active ? `0 0 8px ${color}80` : 'none'
                  }}
                />
                {label}
              </div>
            )
          })}
        </div>
      </div>

      {/* Favorites */}
      <button
        style={favoritesBtn}
        type="button"
        onClick={onOpenFavorites}
      >
        ★ 收藏箱
        {favoritesCount > 0 ? (
          <span style={favoritesCountBadge}>{favoritesCount}</span>
        ) : null}
      </button>

      {/* Push actions */}
      <div style={section}>
        <p style={sectionLabel}>消息推送</p>
        <button
          disabled={pushDisabled || !isFeishuConfigured}
          style={{
            ...pushBtn,
            opacity: pushDisabled || !isFeishuConfigured ? 0.3 : 1
          }}
          type="button"
          onClick={onPushFeishu}
        >
          {isPushing === 'feishu' ? '推送中…' : '飞书推送'}
        </button>
        <button
          disabled={pushDisabled || !wechatWebhookUrl}
          style={{
            ...pushBtn,
            opacity: pushDisabled || !wechatWebhookUrl ? 0.3 : 1
          }}
          type="button"
          onClick={onPushWechat}
        >
          {isPushing === 'wechat' ? '推送中…' : '微信推送'}
        </button>
      </div>

      {/* Config links */}
      <div style={section}>
        <p style={sectionLabel}>配置</p>
        <button style={configBtn} type="button" onClick={onOpenFeishuConfig}>
          配置飞书
        </button>
        <button style={configBtn} type="button" onClick={onOpenWechatConfig}>
          配置微信
        </button>
        <button style={configBtn} type="button" onClick={onOpenXAccountsConfig}>
          配置 X 账号
          {xTargetAccounts.length > 0 ? (
            <span style={xIndicator}>{xTargetAccounts.length}</span>
          ) : null}
        </button>
        <button style={configBtn} type="button" onClick={onOpenPushHistory}>
          推送记录
        </button>
      </div>
    </aside>
  )
}