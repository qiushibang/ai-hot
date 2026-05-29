import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { OptionsApp } from '../../apps/chrome-extension/src/options/App'

const SETTINGS_URL = 'http://127.0.0.1:4317/api/settings'
const PLATFORM_STATUS_URL = 'http://127.0.0.1:4317/api/status/platforms'

describe('options page', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('loads settings, saves webhook updates, and shows success feedback', async () => {
    // Arrange
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            includeKeywords: ['agent'],
            excludeKeywords: [],
            enabledPlatforms: ['github'],
            feishuWebhookUrl: 'https://example.com/old-feishu',
            wechatWebhookUrl: null,
            feishuAppId: null,
            feishuAppSecret: null,
            feishuReceiveId: null
          },
          error: null
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              platform: 'x',
              state: 'not_logged_in',
              detail: '当前浏览器未登录该平台',
              lastUpdatedAt: '2026-05-23T10:00:00.000Z',
              lastCollectedAt: null
            }
          ],
          error: null
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            includeKeywords: ['agent'],
            excludeKeywords: [],
            enabledPlatforms: ['github'],
            feishuWebhookUrl: 'https://example.com/new-feishu',
            wechatWebhookUrl: 'https://example.com/wechat',
            feishuAppId: null,
            feishuAppSecret: null,
            feishuReceiveId: null
          },
          error: null
        })
      })

    vi.stubGlobal('fetch', fetchMock)

    // Act
    render(<OptionsApp />)

    const feishuInput = await screen.findByLabelText('飞书 Webhook')
    const wechatInput = screen.getByLabelText('企业微信 Webhook')
    fireEvent.change(feishuInput, { target: { value: 'https://example.com/new-feishu' } })
    fireEvent.change(wechatInput, { target: { value: 'https://example.com/wechat' } })
    fireEvent.click(screen.getByRole('button', { name: '保存设置' }))

    // Assert
    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(1, SETTINGS_URL)
      expect(fetchMock).toHaveBeenNthCalledWith(2, PLATFORM_STATUS_URL)
      expect(fetchMock).toHaveBeenNthCalledWith(3, SETTINGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          includeKeywords: ['agent'],
          excludeKeywords: [],
          enabledPlatforms: ['github'],
          feishuWebhookUrl: 'https://example.com/new-feishu',
          wechatWebhookUrl: 'https://example.com/wechat',
          feishuAppId: null,
          feishuAppSecret: null,
          feishuReceiveId: null
        })
      })
      expect(screen.getByText('设置已保存。')).toBeDefined()
      expect(screen.getByText('平台状态')).toBeDefined()
      expect(screen.getByText('当前浏览器未登录该平台')).toBeDefined()
    })
  })

  test('shows a load error when settings cannot be fetched', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    // Act
    render(<OptionsApp />)

    // Assert
    expect(await screen.findByText('暂时无法加载设置。')).toBeDefined()
  })
})
