import React, { useState } from 'react'
import { clearHistory, loadHistory, type PushHistoryEntry } from '../lib/pushHistory'
import { Modal } from './Modal'

type Props = {
  open: boolean
  onClose: () => void
}

const list: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'grid',
  gap: '8px',
  maxHeight: '50vh',
  overflowY: 'auto'
}

const item: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  fontSize: '13px',
  fontFamily: 'var(--font-body)'
}

const channelBadge = (channel: 'feishu' | 'wechat'): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#fff',
  background: channel === 'feishu' ? '#c9a96e' : '#5a9e6f'
})

const empty: React.CSSProperties = {
  textAlign: 'center',
  color: 'var(--color-text-muted)',
  fontSize: '14px',
  fontFamily: 'var(--font-body)',
  padding: '32px 0'
}

const footer: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: '14px'
}

const clearBtn: React.CSSProperties = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: '6px 14px',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  fontSize: '12px',
  fontFamily: 'var(--font-body)',
  cursor: 'pointer'
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const PushHistoryModal = ({ open, onClose }: Props) => {
  const [entries, setEntries] = useState<PushHistoryEntry[]>(loadHistory)

  const handleClear = () => {
    clearHistory()
    setEntries([])
  }

  return (
    <Modal open={open} title="推送记录" onClose={onClose}>
      {entries.length === 0 ? (
        <p style={empty}>暂无推送记录</p>
      ) : (
        <ul style={list}>
          {entries.map((e) => (
            <li key={e.id} style={item}>
              <div>
                <span style={channelBadge(e.channel)}>{e.channel === 'feishu' ? '飞书' : '微信'}</span>
                {' '}
                <span style={{ color: 'var(--color-text)', marginLeft: '8px' }}>
                  {e.itemCount} 条 · {e.searchQuery}
                </span>
              </div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                {formatTime(e.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {entries.length > 0 ? (
        <div style={footer}>
          <button style={clearBtn} type="button" onClick={handleClear}>
            清空记录
          </button>
        </div>
      ) : null}
    </Modal>
  )
}