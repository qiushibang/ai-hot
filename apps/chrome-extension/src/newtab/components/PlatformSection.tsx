import type { FeedItem, PlatformCollectionState } from '@ai-hot/shared'
import React from 'react'

import { FavoriteButton } from './FavoriteButton'

/* eslint-disable no-unused-vars */
type PlatformSectionProps = {
  favoriteItemIds: string[]
  title: string
  items: FeedItem[]
  message: string | null
  state: PlatformCollectionState
  onFavorite: (itemId: string) => void
}
/* eslint-enable no-unused-vars */

const STATUS_LABELS: Record<Exclude<PlatformCollectionState, 'ready' | 'no_results'>, string> = {
  browser_unavailable: 'Chrome 不可用',
  profile_unavailable: 'Profile 不可用',
  not_logged_in: '未登录',
  session_busy: '会话繁忙',
  parse_failed: '抓取失败',
  platform_unavailable: '平台不可用'
}

const section: React.CSSProperties = {
  padding: '28px',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-raised)',
  transition: 'background 0.5s ease, border 0.5s ease'
}

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: '18px',
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: 'var(--color-text)'
}

const message: React.CSSProperties = {
  margin: '14px 0 0',
  fontSize: '14px',
  lineHeight: 1.6,
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-body)'
}

const statusBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  marginTop: '12px',
  padding: '5px 10px',
  borderRadius: '999px',
  background: 'var(--color-accent-soft)',
  color: 'var(--color-accent)',
  fontSize: '11px',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase'
}

const list: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: '18px 0 0',
  display: 'grid',
  gap: '12px'
}

const card: React.CSSProperties = {
  padding: '18px 20px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  transition: 'transform 0.25s ease, box-shadow 0.25s ease, background 0.5s ease'
}

const link: React.CSSProperties = {
  color: 'var(--color-text)',
  fontSize: '16px',
  lineHeight: 1.35,
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  textDecoration: 'none'
}

const summary: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: '14px',
  lineHeight: 1.6,
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-body)'
}

export const PlatformSection = ({
  favoriteItemIds,
  title,
  items,
  message: msg,
  state,
  onFavorite
}: PlatformSectionProps) => {
  const statusLabel = state !== 'ready' && state !== 'no_results' ? STATUS_LABELS[state] : null

  return (
    <section style={section}>
      <h2 style={sectionTitle}>{title}</h2>
      {items.length === 0 ? <p style={message}>{msg ?? '今日暂无结果'}</p> : null}
      {statusLabel ? <span style={statusBadge}>{statusLabel}</span> : null}
      <ul style={list}>
        {items.map((item) => {
          const isFavorited = favoriteItemIds.includes(item.id)

          return (
            <li
              key={item.id}
              style={card}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <a href={item.url} style={link} target="_blank" rel="noreferrer">
                {item.title}
              </a>
              <p style={summary}>{item.summary}</p>
              <FavoriteButton
                isFavorited={isFavorited}
                itemTitle={item.title}
                onClick={() => onFavorite(item.id)}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}