import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Platform } from '@ai-hot/shared'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { FilterBar } from '../../apps/chrome-extension/src/newtab/components/FilterBar'

const DEFAULT_PROPS = {
  enabledPlatforms: ['github', 'x', 'youtube', 'huggingface'] as Platform[],
  searchQuery: '',
  isCollecting: false,
  isFeishuConfigured: false,
  wechatWebhookUrl: null,
  itemCount: 0,
  isPushing: null as 'feishu' | 'wechat' | null,
  onSearchChange: vi.fn(),
  onCollect: vi.fn(),
  onPushFeishu: vi.fn(),
  onPushWechat: vi.fn(),
  onOpenFeishuConfig: vi.fn(),
  onOpenWechatConfig: vi.fn(),
  onOpenPushHistory: vi.fn(),
  onTogglePlatform: vi.fn()
}

describe('push buttons', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('always shows all 5 buttons', () => {
    render(<FilterBar {...DEFAULT_PROPS} />)

    expect(screen.getByText('配置飞书')).toBeDefined()
    expect(screen.getByText('配置微信')).toBeDefined()
    expect(screen.getByText('飞书推送')).toBeDefined()
    expect(screen.getByText('微信推送')).toBeDefined()
    expect(screen.getByText('推送记录')).toBeDefined()
  })

  test('disables push buttons when not configured', () => {
    render(<FilterBar {...DEFAULT_PROPS} isFeishuConfigured={false} wechatWebhookUrl={null} />)

    const feishuBtn = screen.getByText('飞书推送') as HTMLButtonElement
    const wechatBtn = screen.getByText('微信推送') as HTMLButtonElement

    expect(feishuBtn.disabled).toBe(true)
    expect(wechatBtn.disabled).toBe(true)
  })

  test('config buttons are never disabled, even when itemCount is 0', () => {
    render(<FilterBar {...DEFAULT_PROPS} isFeishuConfigured={false} wechatWebhookUrl={null} itemCount={0} />)

    const feishuBtn = screen.getByText('配置飞书') as HTMLButtonElement
    const wechatBtn = screen.getByText('配置微信') as HTMLButtonElement

    expect(feishuBtn.disabled).toBe(false)
    expect(wechatBtn.disabled).toBe(false)
  })

  test('enables push buttons when configured and items exist', () => {
    render(
      <FilterBar
        {...DEFAULT_PROPS}
        isFeishuConfigured={true}
        wechatWebhookUrl="https://example.com/wechat"
        itemCount={3}
      />
    )

    const feishuBtn = screen.getByText('飞书推送') as HTMLButtonElement
    const wechatBtn = screen.getByText('微信推送') as HTMLButtonElement

    expect(feishuBtn.disabled).toBe(false)
    expect(wechatBtn.disabled).toBe(false)
  })

  test('disables push buttons when itemCount is 0 even if configured', () => {
    render(
      <FilterBar
        {...DEFAULT_PROPS}
        isFeishuConfigured={true}
        itemCount={0}
      />
    )

    const feishuBtn = screen.getByText('飞书推送') as HTMLButtonElement
    expect(feishuBtn.disabled).toBe(true)
  })

  test('disables push buttons when isPushing is set', () => {
    render(
      <FilterBar
        {...DEFAULT_PROPS}
        isFeishuConfigured={true}
        wechatWebhookUrl="https://example.com/wechat"
        itemCount={3}
        isPushing="feishu"
      />
    )

    const feishuBtn = screen.getByText('推送中…') as HTMLButtonElement
    const wechatBtn = screen.getByText('微信推送') as HTMLButtonElement

    expect(feishuBtn.disabled).toBe(true)
    expect(wechatBtn.disabled).toBe(true)
  })

  test('shows "推送中…" text on the active push button', () => {
    render(
      <FilterBar
        {...DEFAULT_PROPS}
        isFeishuConfigured={true}
        itemCount={3}
        isPushing="feishu"
      />
    )

    expect(screen.getByText('推送中…')).toBeDefined()
  })

  test('calls onPushFeishu when feishu push button is clicked', () => {
    const onPushFeishu = vi.fn()

    render(
      <FilterBar
        {...DEFAULT_PROPS}
        isFeishuConfigured={true}
        itemCount={3}
        onPushFeishu={onPushFeishu}
      />
    )

    fireEvent.click(screen.getByText('飞书推送'))
    expect(onPushFeishu).toHaveBeenCalledTimes(1)
  })

  test('calls onPushWechat when wechat push button is clicked', () => {
    const onPushWechat = vi.fn()

    render(
      <FilterBar
        {...DEFAULT_PROPS}
        wechatWebhookUrl="https://example.com/wechat"
        itemCount={3}
        onPushWechat={onPushWechat}
      />
    )

    fireEvent.click(screen.getByText('微信推送'))
    expect(onPushWechat).toHaveBeenCalledTimes(1)
  })

  test('calls onOpenFeishuConfig when feishu config button is clicked', () => {
    const onOpenFeishuConfig = vi.fn()

    render(
      <FilterBar
        {...DEFAULT_PROPS}
        isFeishuConfigured={false}
        onOpenFeishuConfig={onOpenFeishuConfig}
      />
    )

    fireEvent.click(screen.getByText('配置飞书'))
    expect(onOpenFeishuConfig).toHaveBeenCalledTimes(1)
  })

  test('calls onOpenWechatConfig when wechat config button is clicked', () => {
    const onOpenWechatConfig = vi.fn()

    render(
      <FilterBar
        {...DEFAULT_PROPS}
        wechatWebhookUrl={null}
        onOpenWechatConfig={onOpenWechatConfig}
      />
    )

    fireEvent.click(screen.getByText('配置微信'))
    expect(onOpenWechatConfig).toHaveBeenCalledTimes(1)
  })

  test('calls onOpenPushHistory when push history button is clicked', () => {
    const onOpenPushHistory = vi.fn()

    render(<FilterBar {...DEFAULT_PROPS} onOpenPushHistory={onOpenPushHistory} />)

    fireEvent.click(screen.getByText('推送记录'))
    expect(onOpenPushHistory).toHaveBeenCalledTimes(1)
  })
})