import type { FeedItem } from '@ai-hot/shared'
import React from 'react'
import { Modal } from './Modal'

/* eslint-disable no-unused-vars */
type FavoritesPanelProps = {
  open: boolean
  items: FeedItem[]
  isPushing: 'feishu' | 'wechat' | null
  onClose: () => void
  onPushFeishu: () => void
  onPushWechat: () => void
  onUnfavorite: (itemId: string) => void
}
/* eslint-enable no-unused-vars */

const PLATFORM_LABELS: Record<string, string> = {
  github: 'GitHub',
  x: 'X',
  youtube: 'YouTube',
  huggingface: 'Hugging Face'
}

const PLATFORM_COLORS: Record<string, string> = {
  github: 'var(--color-platform-github)',
  x: 'var(--color-platform-x)',
  youtube: 'var(--color-platform-youtube)',
  huggingface: 'var(--color-platform-huggingface)'
}

const empty: React.CSSProperties = {
  textAlign: 'center',
  color: 'var(--color-text-muted)',
  fontSize: '14px',
  fontFamily: 'var(--font-body)',
  padding: '40px 0'
}

const list: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'grid',
  gap: '10px',
  maxHeight: '55vh',
  overflowY: 'auto'
}

const card: React.CSSProperties = {
  position: 'relative',
  padding: '14px 16px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  transition: 'border-color 0.2s ease'
}

const platformBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  marginBottom: '6px',
  fontSize: '11px',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  color: 'var(--color-text-muted)'
}

const platformDot: React.CSSProperties = {
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  flexShrink: 0
}

const link: React.CSSProperties = {
  display: 'block',
  color: 'var(--color-text)',
  fontSize: '14px',
  lineHeight: 1.35,
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  textDecoration: 'none',
  paddingRight: '32px'
}

const summary: React.CSSProperties = {
  margin: '4px 32px 0 0',
  fontSize: '13px',
  lineHeight: 1.5,
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-body)'
}

const unfavoriteBtn: React.CSSProperties = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  width: '26px',
  height: '26px',
  border: 'none',
  borderRadius: '50%',
  background: 'transparent',
  color: 'var(--color-accent)',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s ease'
}

const pushRow: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  marginTop: '20px',
  paddingTop: '16px',
  borderTop: '1px solid var(--color-border)'
}

const pushBtn: React.CSSProperties = {
  flex: 1,
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: '9px 0',
  background: 'transparent',
  color: 'var(--color-text)',
  fontSize: '13px',
  fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  transition: 'border 0.2s ease, opacity 0.2s ease'
}

const countLabel: React.CSSProperties = {
  fontSize: '13px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  marginBottom: '16px'
}

export const FavoritesPanel = ({
  open,
  items,
  isPushing,
  onClose,
  onPushFeishu,
  onPushWechat,
  onUnfavorite
}: FavoritesPanelProps) => {
  const pushDisabled = items.length === 0 || isPushing !== null

  return (
    <Modal open={open} title="收藏箱" onClose={onClose}>
      {items.length === 0 ? (
        <p style={empty}>暂无收藏内容</p>
      ) : (
        <>
          <p style={countLabel}>共 {items.length} 条收藏</p>
          <ul style={list}>
            {items.map((item) => (
              <li key={item.id} style={card}>
                <button
                  style={unfavoriteBtn}
                  type="button"
                  aria-label={`取消收藏 ${item.title}`}
                  onClick={() => onUnfavorite(item.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-accent-soft)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  ★
                </button>
                <div style={platformBadge}>
                  <span style={{ ...platformDot, background: PLATFORM_COLORS[item.platform] ?? 'var(--color-text-muted)' }} />
                  {PLATFORM_LABELS[item.platform] ?? item.platform}
                </div>
                <a href={item.url} style={link} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
                <p style={summary}>{item.summary}</p>
              </li>
            ))}
          </ul>
          <div style={pushRow}>
            <button
              disabled={pushDisabled}
              style={{
                ...pushBtn,
                opacity: pushDisabled ? 0.3 : 1
              }}
              type="button"
              onClick={onPushFeishu}
            >
              {isPushing === 'feishu' ? '推送中…' : '飞书推送'}
            </button>
            <button
              disabled={pushDisabled}
              style={{
                ...pushBtn,
                opacity: pushDisabled ? 0.3 : 1
              }}
              type="button"
              onClick={onPushWechat}
            >
              {isPushing === 'wechat' ? '推送中…' : '微信推送'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}