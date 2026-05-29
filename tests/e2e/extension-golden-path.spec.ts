import { expect, test } from '@playwright/test'

import { API_ROUTES } from '../../packages/shared/src/api'
import type { FeedItem } from '../../packages/shared/src/feed'
import { createDefaultSettings, type Settings } from '../../packages/shared/src/settings'

const COMPANION_SERVICE_ORIGIN = 'http://127.0.0.1:4317'

const createFeedItem = (overrides: Partial<FeedItem>): FeedItem => ({
  id: 'github-1',
  platform: 'github',
  title: 'Open Memory MCP',
  summary: 'A memory layer for AI coding agents.',
  url: 'https://example.com/open-memory-mcp',
  author: 'anthropic-labs',
  publishedAt: '2026-05-22T08:00:00.000Z',
  popularityScore: 95,
  growthScore: 90,
  rawTags: ['memory', 'agent'],
  sourceId: 'repo-open-memory-mcp',
  ...overrides
})

const createTodayFeed = () => ({
  github: {
    items: [
      createFeedItem({ id: 'github-1', platform: 'github', title: 'Open Memory MCP' }),
      createFeedItem({
        id: 'github-2',
        platform: 'github',
        title: 'Vision Agent',
        summary: 'Computer vision orchestration toolkit.',
        url: 'https://example.com/vision-agent',
        sourceId: 'repo-vision-agent'
      })
    ],
    message: null
  },
  x: {
    items: [
      createFeedItem({
        id: 'x-1',
        platform: 'x',
        title: 'X launch thread',
        summary: 'A thread about multi-agent memory.',
        url: 'https://example.com/x-thread',
        sourceId: 'x-thread-1'
      })
    ],
    message: null
  },
  youtube: {
    items: [],
    message: '今日结果较少'
  },
  huggingface: {
    items: [],
    message: '今日结果较少'
  }
})

const createSettings = (): Settings => ({
  ...createDefaultSettings(),
  includeKeywords: ['agent'],
  enabledPlatforms: ['github'],
  feishuWebhookUrl: 'https://example.com/feishu'
})

test.describe('extension golden path', () => {
  test('newtab renders feed and favorites work against mocked localhost APIs', async ({ page }) => {
    let favoriteRequestBody: string | null = null

    await page.route(`${COMPANION_SERVICE_ORIGIN}${API_ROUTES.status}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true })
      })
    })

    await page.route(`${COMPANION_SERVICE_ORIGIN}${API_ROUTES.todayFeed}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: createTodayFeed(),
          error: null
        })
      })
    })

    await page.route(`${COMPANION_SERVICE_ORIGIN}${API_ROUTES.favorites}`, async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [],
            error: null
          })
        })
        return
      }

      favoriteRequestBody = request.postData()

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { itemId: 'github-1' },
          error: null
        })
      })
    })

    await page.goto('/newtab/')

    await expect(page.getByText('Connected to localhost companion service')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'GitHub' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open Memory MCP' })).toBeVisible()

    await page.getByRole('button', { name: '收藏 Open Memory MCP' }).click()

    await expect(page.getByRole('button', { name: '已收藏 Open Memory MCP' })).toBeDisabled()
    expect(favoriteRequestBody).toBe(JSON.stringify({ itemId: 'github-1' }))
  })

  test('options page loads settings and saves webhook changes', async ({ page }) => {
    let savedSettingsBody: string | null = null

    await page.route(`${COMPANION_SERVICE_ORIGIN}${API_ROUTES.settings}`, async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: createSettings(),
            error: null
          })
        })
        return
      }

      savedSettingsBody = request.postData()

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...createDefaultSettings(),
            includeKeywords: ['agent'],
            enabledPlatforms: ['github'],
            feishuWebhookUrl: 'https://example.com/new-feishu',
            wechatWebhookUrl: 'https://example.com/wechat'
          },
          error: null
        })
      })
    })

    await page.goto('/options/')

    await expect(page.getByRole('heading', { name: '推送设置' })).toBeVisible()

    await page.getByLabel('飞书 Webhook').fill('https://example.com/new-feishu')
    await page.getByLabel('企业微信 Webhook').fill('https://example.com/wechat')
    await page.getByRole('button', { name: '保存设置' }).click()

    await expect(page.getByText('设置已保存。')).toBeVisible()
    expect(savedSettingsBody).toBe(
      JSON.stringify({
        ...createDefaultSettings(),
        includeKeywords: ['agent'],
        enabledPlatforms: ['github'],
        feishuWebhookUrl: 'https://example.com/new-feishu',
        wechatWebhookUrl: 'https://example.com/wechat'
      })
    )
  })
})
