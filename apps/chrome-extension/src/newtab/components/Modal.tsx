import React, { useEffect } from 'react'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background: 'rgba(0, 0, 0, 0.55)',
  backdropFilter: 'blur(8px)',
  animation: 'fadeRise 0.2s ease both'
}

const dialog: React.CSSProperties = {
  width: 'min(520px, 100%)',
  maxHeight: '85vh',
  overflowY: 'auto',
  padding: '32px',
  borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--color-border-strong)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-body)',
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.4)'
}

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px'
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '20px',
  fontFamily: 'var(--font-display)',
  fontWeight: 600
}

const closeBtn: React.CSSProperties = {
  border: 'none',
  borderRadius: '50%',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--color-surface-raised)',
  color: 'var(--color-text-muted)',
  fontSize: '18px',
  cursor: 'pointer',
  lineHeight: 1
}

export const Modal = ({ open, title, onClose, children }: ModalProps) => {
  useEffect(() => {
    if (!open) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handler)

    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div style={dialog}>
        <div style={header}>
          <h2 style={titleStyle}>{title}</h2>
          <button style={closeBtn} type="button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}