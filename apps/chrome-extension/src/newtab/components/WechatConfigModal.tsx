import type { Settings } from '@ai-hot/shared'
import React, { useState } from 'react'
import { saveSettings } from '../lib/saveSettings'
import {
  deleteWechatPreset,
  loadWechatPresets,
  saveWechatPreset,
  type WechatPreset
} from '../lib/configPresets'
import { Modal } from './Modal'

/* eslint-disable no-unused-vars */
type Props = {
  open: boolean
  settings: Settings
  onSave: (settings: Settings) => void
  onClose: () => void
}
/* eslint-enable no-unused-vars */

const field: React.CSSProperties = {
  display: 'grid',
  gap: '6px',
  marginBottom: '14px'
}

const label: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-body)'
}

const input: React.CSSProperties = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '13px',
  fontFamily: 'var(--font-body)',
  outline: 'none'
}

const btnRow: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  marginTop: '18px'
}

const primary: React.CSSProperties = {
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 22px',
  background: 'var(--color-accent)',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer'
}

const secondary: React.CSSProperties = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 22px',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  fontSize: '13px',
  fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer'
}

const presetSection: React.CSSProperties = {
  marginTop: '20px',
  paddingTop: '18px',
  borderTop: '1px solid var(--color-border)'
}

const presetTitle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: '12px',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)'
}

const presetItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  marginBottom: '6px',
  fontSize: '13px'
}

const smallBtn: React.CSSProperties = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: '6px',
  padding: '4px 10px',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  fontSize: '11px',
  fontFamily: 'var(--font-body)',
  cursor: 'pointer'
}

const msg: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  fontFamily: 'var(--font-body)'
}

export const WechatConfigModal = ({ open, settings, onSave, onClose }: Props) => {
  const [draft, setDraft] = useState({ wechatWebhookUrl: settings.wechatWebhookUrl ?? '' })
  const [presetName, setPresetName] = useState('')
  const [presets, setPresets] = useState<WechatPreset[]>(loadWechatPresets)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const updated = { ...settings, wechatWebhookUrl: draft.wechatWebhookUrl || null }
      const saved = await saveSettings(updated)
      onSave(saved)
      setMessage({ type: 'success', text: '已保存' })
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleSavePreset = () => {
    const name = presetName.trim()
    if (!name) return
    setPresets(saveWechatPreset(name, { wechatWebhookUrl: draft.wechatWebhookUrl || null }))
    setPresetName('')
    setMessage({ type: 'success', text: `预设"${name}"已保存` })
  }

  const handleLoadPreset = (p: WechatPreset) => {
    setDraft({ wechatWebhookUrl: p.wechatWebhookUrl ?? '' })
    setMessage(null)
  }

  const handleDeletePreset = (id: string) => {
    setPresets(deleteWechatPreset(id))
  }

  return (
    <Modal open={open} title="企业微信推送配置" onClose={onClose}>
      <label style={field}>
        <span style={label}>Webhook URL</span>
        <input
          style={input}
          value={draft.wechatWebhookUrl}
          onChange={(e) => {
            setDraft({ wechatWebhookUrl: e.target.value })
            setMessage(null)
          }}
        />
      </label>

      <div style={btnRow}>
        <button style={primary} type="button" disabled={saving} onClick={handleSave}>
          {saving ? '保存中…' : '保存'}
        </button>
        <button style={secondary} type="button" onClick={onClose}>关闭</button>
        {message ? (
          <span style={{ ...msg, color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)' }}>
            {message.text}
          </span>
        ) : null}
      </div>

      <div style={presetSection}>
        <p style={presetTitle}>配置预设</p>
        {presets.map((p) => (
          <div key={p.id} style={presetItem}>
            <span>{p.name}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={smallBtn} type="button" onClick={() => handleLoadPreset(p)}>加载</button>
              <button style={smallBtn} type="button" onClick={() => handleDeletePreset(p.id)}>删除</button>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <input
            style={{ ...input, flex: 1 }}
            placeholder="预设名称…"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
          />
          <button style={secondary} type="button" onClick={handleSavePreset} disabled={!presetName.trim()}>
            存为预设
          </button>
        </div>
      </div>
    </Modal>
  )
}