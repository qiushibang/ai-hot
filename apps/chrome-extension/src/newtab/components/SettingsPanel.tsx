import type { Settings } from '@ai-hot/shared'
import React, { useState } from 'react'
import { saveSettings } from '../lib/saveSettings'

/* eslint-disable no-unused-vars */
type SettingsPanelProps = {
  settings: Settings
  onSave: (settings: Settings) => void
  onClose: () => void
}
/* eslint-enable no-unused-vars */

const panel: React.CSSProperties = {
  marginTop: '16px',
  display: 'grid',
  gap: '18px',
  padding: '24px',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-accent-glow)',
  background: 'var(--color-surface-raised)',
  fontFamily: 'var(--font-body)',
  transition: 'background 0.5s ease, border 0.5s ease'
}

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-accent)'
}

const field: React.CSSProperties = {
  display: 'grid',
  gap: '6px'
}

const fieldLabel: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-body)'
}

const inputBase: React.CSSProperties = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '13px',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  transition: 'border 0.25s ease, background 0.5s ease'
}

const buttonRow: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  alignItems: 'center'
}

const saveBtn: React.CSSProperties = {
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

const cancelBtn: React.CSSProperties = {
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

const msgBase: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  fontFamily: 'var(--font-body)'
}

export const SettingsPanel = ({ settings, onSave, onClose }: SettingsPanelProps) => {
  const [draft, setDraft] = useState<Settings>(settings)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const updateField = (field: keyof Settings, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value.trim() === '' ? null : value }))
    setMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const saved = await saveSettings(draft)
      onSave(saved)
      setMessage({ type: 'success', text: '已保存' })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={panel}>
      <p style={sectionTitle}>飞书推送</p>
      <label style={field}>
        <span style={fieldLabel}>Webhook URL（备选）</span>
        <input
          aria-label="飞书 Webhook"
          style={inputBase}
          value={draft.feishuWebhookUrl ?? ''}
          onChange={(e) => updateField('feishuWebhookUrl', e.target.value)}
        />
      </label>
      <label style={field}>
        <span style={fieldLabel}>App ID</span>
        <input
          aria-label="飞书 App ID"
          style={inputBase}
          value={draft.feishuAppId ?? ''}
          onChange={(e) => updateField('feishuAppId', e.target.value)}
        />
      </label>
      <label style={field}>
        <span style={fieldLabel}>App Secret</span>
        <input
          aria-label="飞书 App Secret"
          style={inputBase}
          type="password"
          value={draft.feishuAppSecret ?? ''}
          onChange={(e) => updateField('feishuAppSecret', e.target.value)}
        />
      </label>
      <label style={field}>
        <span style={fieldLabel}>Receive ID</span>
        <input
          aria-label="飞书 Receive ID"
          style={inputBase}
          placeholder="oc_ 群聊 / ou_ 私聊"
          value={draft.feishuReceiveId ?? ''}
          onChange={(e) => updateField('feishuReceiveId', e.target.value)}
        />
      </label>

      <p style={sectionTitle}>企业微信推送</p>
      <label style={field}>
        <span style={fieldLabel}>Webhook URL</span>
        <input
          aria-label="企业微信 Webhook"
          style={inputBase}
          value={draft.wechatWebhookUrl ?? ''}
          onChange={(e) => updateField('wechatWebhookUrl', e.target.value)}
        />
      </label>

      <div style={buttonRow}>
        <button style={saveBtn} type="button" disabled={saving} onClick={handleSave}>
          {saving ? '保存中…' : '保存'}
        </button>
        <button style={cancelBtn} type="button" onClick={onClose}>
          关闭
        </button>
        {message ? (
          <span
            style={{
              ...msgBase,
              color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'
            }}
          >
            {message.text}
          </span>
        ) : null}
      </div>
    </div>
  )
}