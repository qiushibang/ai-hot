import type { FeedItem, Platform, PlatformCollectionState } from '@ai-hot/shared'
import React from 'react'

import { FavoriteButton } from './FavoriteButton'

/* eslint-disable no-unused-vars */
type PlatformSectionProps = {
  platform: Platform
  favoriteItemIds: string[]
  title: string
  items: FeedItem[]
  message: string | null
  state: PlatformCollectionState
  onFavorite: (itemId: string) => void
}
/* eslint-enable no-unused-vars */

const PLATFORM_COLORS: Record<Platform, string> = {
  github: 'var(--color-platform-github)',
  x: 'var(--color-platform-x)',
  youtube: 'var(--color-platform-youtube)',
  huggingface: 'var(--color-platform-huggingface)'
}

const STATUS_LABELS: Record<Exclude<PlatformCollectionState, 'ready' | 'no_results'>, string> = {
  browser_unavailable: 'Chrome 不可用',
  profile_unavailable: 'Profile 不可用',
  not_logged_in: '未登录',
  session_busy: '会话繁忙',
  parse_failed: '抓取失败',
  platform_unavailable: '平台不可用'
}

const card: React.CSSProperties = {
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  transition: 'transform 0.25s ease, box-shadow 0.25s ease, background 0.5s ease'
}

const titleBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '16px 20px',
  borderBottom: '1px solid var(--color-border)'
}

const dot: React.CSSProperties = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  flexShrink: 0
}

const titleText: React.CSSProperties = {
  margin: 0,
  fontSize: '14px',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  color: 'var(--color-text)',
  letterSpacing: '0.02em'
}

const countBadge: React.CSSProperties = {
  marginLeft: 'auto',
  padding: '2px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)'
}

const body: React.CSSProperties = {
  padding: '16px 20px 20px'
}

const messageStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '14px',
  lineHeight: 1.6,
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-body)'
}

const statusBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  marginTop: '10px',
  padding: '4px 10px',
  borderRadius: '999px',
  background: 'var(--color-accent-soft)',
  color: 'var(--color-accent)',
  fontSize: '11px',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  letterSpacing: '0.05em',
  textTransform: 'uppercase'
}

const list: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'grid',
  gap: '10px'
}

const itemCard: React.CSSProperties = {
  position: 'relative',
  padding: '14px 16px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  transition: 'border-color 0.2s ease, background 0.5s ease'
}

const link: React.CSSProperties = {
  display: 'block',
  color: 'var(--color-text)',
  fontSize: '15px',
  lineHeight: 1.35,
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  textDecoration: 'none',
  paddingRight: '32px'
}

const summary: React.CSSProperties = {
  margin: '6px 32px 0 0',
  fontSize: '13px',
  lineHeight: 1.55,
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-body)'
}

export const PlatformSection = ({
  platform,
  favoriteItemIds,
  title,
  items,
  message: msg,
  state,
  onFavorite
}: PlatformSectionProps) => {
  const platformColor = PLATFORM_COLORS[platform]
  const statusLabel = state !== 'ready' && state !== 'no_results' ? STATUS_LABELS[state] : null

  return (
    <section
      style={{
        ...card,
        borderTop: `2px solid ${platformColor}`,
        '--platform-color': platformColor
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.18)`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      {/* Title bar */}
      <div style={titleBar}>
        <span style={{ ...dot, background: platformColor }} />
        <h2 style={titleText}>{title}</h2>
        {items.length > 0 ? (
          <span style={countBadge}>{items.length}</span>
        ) : null}
      </div>

      {/* Body */}
      <div style={body}>
        {items.length === 0 ? <p style={messageStyle}>{msg ?? '今日暂无结果'}</p> : null}
        {statusLabel ? <span style={statusBadge}>{statusLabel}</span> : null}

        <ul style={list}>
          {items.map((item) => {
            const isFavorited = favoriteItemIds.includes(item.id)

            return (
              <li
                key={item.id}
                style={itemCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = platformColor
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
              >
                <FavoriteButton
                  isFavorited={isFavorited}
                  itemTitle={item.title}
                  onClick={() => onFavorite(item.id)}
                />
                <a href={item.url} style={link} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
                <p style={summary}>{item.summary}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}