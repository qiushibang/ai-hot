import React from 'react'

type FavoriteButtonProps = {
  isFavorited: boolean
  itemTitle: string
  onClick: () => void
}

const base: React.CSSProperties = {
  marginTop: '10px',
  border: '1px solid var(--color-border-strong)',
  borderRadius: '999px',
  padding: '6px 14px',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  fontSize: '11px',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'background 0.25s ease, color 0.25s ease, border 0.25s ease'
}

const favorited: React.CSSProperties = {
  ...base,
  background: 'var(--color-accent-soft)',
  border: '1px solid var(--color-accent)',
  color: 'var(--color-accent)',
  cursor: 'default'
}

export const FavoriteButton = ({ isFavorited, itemTitle, onClick }: FavoriteButtonProps) => {
  const label = `${isFavorited ? '已收藏' : '收藏'} ${itemTitle}`

  return (
    <button
      aria-label={label}
      disabled={isFavorited}
      style={isFavorited ? favorited : base}
      type="button"
      onClick={onClick}
    >
      {isFavorited ? '已收藏' : '加入收藏箱'}
    </button>
  )
}