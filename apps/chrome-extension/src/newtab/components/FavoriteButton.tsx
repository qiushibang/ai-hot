import React from 'react'

type FavoriteButtonProps = {
  isFavorited: boolean
  itemTitle: string
  onClick: () => void
}

const button: React.CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  width: '28px',
  height: '28px',
  border: 'none',
  borderRadius: '50%',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  fontSize: '16px',
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 0.2s ease, background 0.2s ease, transform 0.2s ease'
}

const favoritedStyle: React.CSSProperties = {
  ...button,
  color: 'var(--color-accent)',
  transform: 'scale(1.1)'
}

export const FavoriteButton = ({ isFavorited, itemTitle, onClick }: FavoriteButtonProps) => {
  const label = `${isFavorited ? '已收藏' : '收藏'} ${itemTitle}`

  return (
    <button
      aria-label={label}
      style={isFavorited ? favoritedStyle : button}
      type="button"
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!isFavorited) {
          e.currentTarget.style.color = 'var(--color-accent)'
          e.currentTarget.style.background = 'var(--color-accent-soft)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isFavorited) {
          e.currentTarget.style.color = 'var(--color-text-muted)'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {isFavorited ? '★' : '☆'}
    </button>
  )
}