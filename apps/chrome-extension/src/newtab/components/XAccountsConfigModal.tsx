import type { Settings } from '@ai-hot/shared'
import React, { useState } from 'react'
import { saveSettings } from '../lib/saveSettings'
import { Modal } from './Modal'

/* eslint-disable no-unused-vars */
type Props = {
  open: boolean
  settings: Settings
  onSave: (settings: Settings) => void
  onClose: () => void
}
/* eslint-enable no-unused-vars */

type PresetAccount = {
  username: string
  label: string
  description: string
}

const PRESET_GROUPS: { title: string; accounts: PresetAccount[] }[] = [
  {
    title: 'AI 官方',
    accounts: [
      { username: 'OpenAI', label: 'OpenAI', description: 'ChatGPT / GPT 系列' },
      { username: 'AnthropicAI', label: 'Anthropic', description: 'Claude 系列' },
      { username: 'GoogleDeepMind', label: 'Google DeepMind', description: 'Gemini 系列' },
      { username: 'MistralAI', label: 'Mistral AI', description: '开源大模型' },
      { username: 'xai', label: 'xAI', description: 'Grok 系列' },
      { username: 'MetaAI', label: 'Meta AI', description: 'Llama 系列' }
    ]
  },
  {
    title: 'AI 产品 / 工具',
    accounts: [
      { username: 'cursor_ai', label: 'Cursor', description: 'AI 代码编辑器' },
      { username: 'v0', label: 'v0', description: 'Vercel AI 前端生成' },
      { username: 'perplexity_ai', label: 'Perplexity', description: 'AI 搜索引擎' },
      { username: 'Replit', label: 'Replit', description: '在线 IDE + AI Agent' },
      { username: 'huggingface', label: 'Hugging Face', description: '开源模型社区' },
      { username: 'LangChainAI', label: 'LangChain', description: 'LLM 开发框架' }
    ]
  },
  {
    title: 'AI 领袖 / 研究者',
    accounts: [
      { username: 'karpathy', label: 'Andrej Karpathy', description: 'OpenAI 联合创始人 / 教育家' },
      { username: 'garrytan', label: 'Garry Tan', description: 'Y Combinator CEO' },
      { username: 'sama', label: 'Sam Altman', description: 'OpenAI CEO' },
      { username: 'ylecun', label: 'Yann LeCun', description: 'Meta AI 首席科学家' },
      { username: 'AndrewYNg', label: 'Andrew Ng', description: 'DeepLearning.AI 创始人' },
      { username: 'DrJimFan', label: 'Jim Fan', description: 'NVIDIA 高级研究科学家' },
      { username: 'demishassabis', label: 'Demis Hassabis', description: 'Google DeepMind CEO' },
      { username: 'drfeifei', label: 'Fei-Fei Li', description: 'Stanford AI 教授' },
      { username: 'svpino', label: 'Santiago', description: 'AI 工程实践分享' },
      { username: 'goodside', label: 'Riley Goodside', description: 'Scale AI Prompt Engineer' }
    ]
  }
]

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
  outline: 'none',
  width: '100%',
  resize: 'vertical'
}

const groupSection: React.CSSProperties = {
  marginBottom: '18px'
}

const groupTitle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: '12px',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)'
}

const presetGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '6px'
}

const presetItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  padding: '8px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  cursor: 'pointer',
  transition: 'border 0.2s ease, background 0.2s ease',
  userSelect: 'none'
}

const presetItemSelected: React.CSSProperties = {
  ...presetItem,
  border: '1px solid var(--color-accent)',
  background: 'var(--color-accent-soft)'
}

const presetCheckbox: React.CSSProperties = {
  width: '16px',
  height: '16px',
  borderRadius: '4px',
  border: '1.5px solid var(--color-border-strong)',
  background: 'transparent',
  cursor: 'pointer',
  position: 'relative',
  flexShrink: 0,
  marginTop: '1px',
  appearance: 'none',
  transition: 'all 0.2s ease'
}

const presetCheckboxChecked: React.CSSProperties = {
  ...presetCheckbox,
  background: 'var(--color-accent)',
  borderColor: 'var(--color-accent)'
}

const presetInfo: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1px',
  minWidth: 0
}

const presetName: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text)'
}

const presetDesc: React.CSSProperties = {
  fontSize: '11px',
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-muted)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
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

const divider: React.CSSProperties = {
  margin: '16px 0',
  border: 'none',
  borderTop: '1px solid var(--color-border)'
}

const msg: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  fontFamily: 'var(--font-body)'
}

const textarea: React.CSSProperties = {
  ...input,
  minHeight: '68px',
  fontFamily: 'monospace',
  fontSize: '13px'
}

const hint: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-body)',
  marginTop: '4px'
}

export const XAccountsConfigModal = ({ open, settings, onSave, onClose }: Props) => {
  const currentAccounts = settings.xTargetAccounts ?? []

  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(() => {
    const allPresets = new Set(
      PRESET_GROUPS.flatMap((g) => g.accounts.map((a) => a.username))
    )
    return new Set(currentAccounts.filter((a) => allPresets.has(a)))
  })

  const [customText, setCustomText] = useState(() => {
    const allPresets = new Set(
      PRESET_GROUPS.flatMap((g) => g.accounts.map((a) => a.username))
    )
    return currentAccounts.filter((a) => !allPresets.has(a)).join('\n')
  })

  const [maxPerAccount, setMaxPerAccount] = useState(settings.xMaxPerAccount ?? 5)

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const togglePreset = (username: string) => {
    setSelectedPresets((prev) => {
      const next = new Set(prev)
      if (next.has(username)) {
        next.delete(username)
      } else {
        next.add(username)
      }
      return next
    })
    setMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const customAccounts = customText
      .split(/[\n,]+/)
      .map((s) => s.trim().replace(/^@/, ''))
      .filter(Boolean)

    const xTargetAccounts = [...new Set([...selectedPresets, ...customAccounts])]

    try {
      const updated: Settings = { ...settings, xTargetAccounts, xMaxPerAccount: maxPerAccount }
      const saved = await saveSettings(updated)
      onSave(saved)
      setMessage({ type: 'success', text: `已保存 ${xTargetAccounts.length} 个账号` })
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const totalCount = selectedPresets.size + customText.split(/[\n,]+/).filter((s) => s.trim().length > 0).length

  return (
    <Modal open={open} title="X 账号配置" onClose={onClose}>
      {PRESET_GROUPS.map((group) => (
        <div key={group.title} style={groupSection}>
          <p style={groupTitle}>{group.title}</p>
          <div style={presetGrid}>
            {group.accounts.map((account) => {
              const checked = selectedPresets.has(account.username)

              return (
                <div
                  key={account.username}
                  style={checked ? presetItemSelected : presetItem}
                  onClick={() => togglePreset(account.username)}
                >
                  <div
                    style={checked ? presetCheckboxChecked : presetCheckbox}
                  >
                    {checked ? (
                      <svg
                        width="10"
                        height="8"
                        viewBox="0 0 10 8"
                        fill="none"
                        style={{ position: 'absolute', top: '3px', left: '2px' }}
                      >
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </div>
                  <div style={presetInfo}>
                    <span style={presetName}>@{account.label}</span>
                    <span style={presetDesc}>{account.description}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <hr style={divider} />

      <div style={field}>
        <span style={label}>自定义账号</span>
        <textarea
          style={textarea}
          placeholder="输入 X 账号名，每行一个（无需 @ 前缀）&#10;例如：&#10;elonmusk&#10;lexfridman"
          value={customText}
          onChange={(e) => {
            setCustomText(e.target.value)
            setMessage(null)
          }}
        />
        <span style={hint}>每行一个账号名，无需 @ 前缀，逗号或换行分隔</span>
      </div>

      <div style={field}>
        <span style={label}>每个账号最多抓取</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="number"
            min={1}
            max={20}
            value={maxPerAccount}
            onChange={(e) => setMaxPerAccount(Math.max(1, Math.min(20, Number(e.target.value) || 5)))}
            style={{ ...input, width: '80px', resize: 'none' }}
          />
          <span style={hint}>条推文（1-20）</span>
        </div>
      </div>

      <div style={btnRow}>
        <button style={primary} type="button" disabled={saving} onClick={handleSave}>
          {saving ? '保存中…' : `保存（${totalCount} 个账号）`}
        </button>
        <button style={secondary} type="button" onClick={onClose}>关闭</button>
        {message ? (
          <span style={{ ...msg, color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)' }}>
            {message.text}
          </span>
        ) : null}
      </div>
    </Modal>
  )
}