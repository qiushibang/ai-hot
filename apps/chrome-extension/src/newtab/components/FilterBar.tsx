import type { Platform } from '@ai-hot/shared'
import React from 'react'

/* eslint-disable no-unused-vars */
type FilterBarProps = {
  enabledPlatforms: Platform[]
  searchQuery: string
  isCollecting: boolean
  isFeishuConfigured: boolean
  wechatWebhookUrl: string | null
  itemCount: number
  isPushing: 'feishu' | 'wechat' | null
  onSearchChange: (value: string) => void
  onCollect: () => void
  onPushFeishu: () => void
  onPushWechat: () => void
  onOpenFeishuConfig: () => void
  onOpenWechatConfig: () => void
  onOpenPushHistory: () => void
  onTogglePlatform: (platform: Platform) => void
}
/* eslint-enable no-unused-vars */

const PLATFORM_OPTIONS: { label: string; platform: Platform }[] = [
  { label: 'GitHub', platform: 'github' },
  { label: 'X', platform: 'x' },
  { label: 'YouTube', platform: 'youtube' },
  { label: 'Hugging Face', platform: 'huggingface' }
]

const form: React.CSSProperties = {
  marginTop: '24px',
  display: 'grid',
  gap: '20px',
  padding: '24px',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-raised)',
  transition: 'background 0.5s ease, border 0.5s ease'
}

const row: React.CSSProperties = {
  display: 'grid',
  gap: '10px'
}

const label: React.CSSProperties = {
  fontSize: '12px',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)'
}

const searchRow: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  alignItems: 'flex-end'
}

const inputBase: React.CSSProperties = {
  flex: 1,
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-md)',
  padding: '12px 16px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '15px',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  transition: 'border 0.25s ease, background 0.5s ease'
}

const accentButton: React.CSSProperties = {
  border: 'none',
  borderRadius: 'var(--radius-md)',
  padding: '12px 22px',
  background: 'var(--color-accent)',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  letterSpacing: '0.02em',
  transition: 'opacity 0.25s ease, filter 0.25s ease'
}

const ghostButton: React.CSSProperties = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 16px',
  background: 'transparent',
  color: 'var(--color-text)',
  fontSize: '13px',
  fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  letterSpacing: '0.02em',
  transition: 'border 0.25s ease, opacity 0.25s ease, color 0.5s ease'
}

const pushRow: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  flexWrap: 'wrap'
}

const options: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px'
}

const checkboxLabel: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '9px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  fontSize: '13px',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  color: 'var(--color-text)',
  cursor: 'pointer',
  transition: 'background 0.5s ease, border 0.25s ease, color 0.5s ease',
  userSelect: 'none'
}

export const FilterBar = ({
  enabledPlatforms,
  searchQuery,
  isCollecting,
  isFeishuConfigured,
  wechatWebhookUrl,
  itemCount,
  isPushing,
  onSearchChange,
  onCollect,
  onPushFeishu,
  onPushWechat,
  onOpenFeishuConfig,
  onOpenWechatConfig,
  onOpenPushHistory,
  onTogglePlatform
}: FilterBarProps) => {
  const pushDisabled = itemCount === 0 || isPushing !== null

  return (
    <form
      style={form}
      onSubmit={(e) => {
        e.preventDefault()
        onCollect()
      }}
    >
      {/* Search */}
      <div style={row}>
        <span style={label}>主题搜索</span>
        <div style={searchRow}>
          <input
            style={inputBase}
            value={searchQuery}
            placeholder="输入主题词，如 AI agent、LLM、RAG..."
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button
            disabled={isCollecting || searchQuery.trim().length === 0}
            style={{
              ...accentButton,
              opacity: isCollecting || searchQuery.trim().length === 0 ? 0.5 : 1
            }}
            type="submit"
          >
            {isCollecting ? '抓取中…' : '抓取'}
          </button>
        </div>
      </div>

      {/* Push */}
      <div style={row}>
        <span style={label}>消息推送</span>
        <div style={pushRow}>
          <button style={ghostButton} type="button" onClick={onOpenFeishuConfig}>
            配置飞书
          </button>
          <button
            disabled={pushDisabled || !isFeishuConfigured}
            style={{
              ...ghostButton,
              opacity: pushDisabled || !isFeishuConfigured ? 0.35 : 1
            }}
            type="button"
            onClick={onPushFeishu}
          >
            {isPushing === 'feishu' ? '推送中…' : '飞书推送'}
          </button>
          <button style={ghostButton} type="button" onClick={onOpenWechatConfig}>
            配置微信
          </button>
          <button
            disabled={pushDisabled || !wechatWebhookUrl}
            style={{
              ...ghostButton,
              opacity: pushDisabled || !wechatWebhookUrl ? 0.35 : 1
            }}
            type="button"
            onClick={onPushWechat}
          >
            {isPushing === 'wechat' ? '推送中…' : '微信推送'}
          </button>
          <button style={ghostButton} type="button" onClick={onOpenPushHistory}>
            推送记录
          </button>
        </div>
      </div>

      {/* Platforms */}
      <div style={row}>
        <span style={label}>平台筛选</span>
        <div style={options}>
          {PLATFORM_OPTIONS.map(({ label: lbl, platform }) => {
            const checked = enabledPlatforms.includes(platform)

            return (
              <label key={platform} style={checkboxLabel}>
                <input
                  className="platform-checkbox"
                  aria-label={`${lbl} 平台`}
                  checked={checked}
                  type="checkbox"
                  onChange={() => onTogglePlatform(platform)}
                />
                {lbl}
              </label>
            )
          })}
        </div>
      </div>
    </form>
  )
}