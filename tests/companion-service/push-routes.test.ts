import type { AddressInfo, Server } from 'node:net'

import { API_ROUTES, createDefaultSettings, type Settings } from '@ai-hot/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { createInMemoryDatabase } from '../../apps/companion-service/src/db/client'
import { createSettingsRepository } from '../../apps/companion-service/src/db/settingsRepository'
import { createServer } from '../../apps/companion-service/src/server/createServer'

const TEST_HOST = '127.0.0.1'
const BASE_SETTINGS: Settings = createDefaultSettings()

const createFeedItem = (overrides = {}) => ({
  id: 'github:1',
  platform: 'github',
  title: 'Test Repo',
  summary: 'Test summary',
  url: 'https://example.com/1',
  author: 'alice',
  publishedAt: '2026-05-21T00:00:00.000Z',
  popularityScore: 10,
  growthScore: 5,
  rawTags: ['ai'],
  sourceId: '1',
  ...overrides
})

describe('companion service push routes', () => {
  let activeServer: Server | null = null

  afterEach(async () => {
    if (!activeServer) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      activeServer?.close((error?: Error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })

    activeServer = null
  })

  test('returns a clear error when push is not configured', async () => {
    // Arrange
    const database = createInMemoryDatabase()
    const settingsRepository = createSettingsRepository(database)
    settingsRepository.save(BASE_SETTINGS)
    const app = createServer({ settingsRepository })

    activeServer = await new Promise<Server>((resolve) => {
      const server = app.listen(0, TEST_HOST, () => {
        resolve(server)
      })
    })

    const address = activeServer.address() as AddressInfo | string | null

    if (!address || typeof address === 'string') {
      throw new Error('Expected server to listen on a TCP port')
    }

    // Act
    const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.pushFeishu}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items: [] })
    })
    const payload = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(payload).toEqual({
      success: false,
      data: null,
      error: '请先在设置页配置飞书推送（Webhook 或开放平台 API）'
    })
  })

  test('sends formatted payload to the webhook URL on success', async () => {
    // Arrange
    const database = createInMemoryDatabase()
    const settingsRepository = createSettingsRepository(database)
    settingsRepository.save({
      ...BASE_SETTINGS,
      feishuWebhookUrl: 'https://example.com/feishu'
    })

    const webhookFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const app = createServer({ settingsRepository, fetchImplementation: webhookFetch as typeof fetch })

    activeServer = await new Promise<Server>((resolve) => {
      const server = app.listen(0, TEST_HOST, () => {
        resolve(server)
      })
    })

    const address = activeServer.address() as AddressInfo | string | null

    if (!address || typeof address === 'string') {
      throw new Error('Expected server to listen on a TCP port')
    }

    // Act
    const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.pushFeishu}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items: [createFeedItem()] })
    })
    const payload = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(webhookFetch).toHaveBeenCalledTimes(1)
    expect(webhookFetch).toHaveBeenCalledWith('https://example.com/feishu', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }))
    expect(payload.success).toBe(true)
    expect(payload.data.sent).toBe(1)
  })

  test('filters items by include and exclude keywords before sending', async () => {
    // Arrange
    const database = createInMemoryDatabase()
    const settingsRepository = createSettingsRepository(database)
    settingsRepository.save({
      ...BASE_SETTINGS,
      feishuWebhookUrl: 'https://example.com/feishu',
      includeKeywords: ['agent'],
      excludeKeywords: ['spam']
    })

    const webhookFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))

    const app = createServer({ settingsRepository, fetchImplementation: webhookFetch as typeof fetch })

    activeServer = await new Promise<Server>((resolve) => {
      const server = app.listen(0, TEST_HOST, () => {
        resolve(server)
      })
    })

    const address = activeServer.address() as AddressInfo | string | null

    if (!address || typeof address === 'string') {
      throw new Error('Expected server to listen on a TCP port')
    }

    // Act
    const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.pushFeishu}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [
          createFeedItem({ id: '1', title: 'AI Agent framework', summary: 'agent tools' }),
          createFeedItem({ id: '2', title: 'Spam repo', summary: 'spam content' }),
          createFeedItem({ id: '3', title: 'Cooking recipes', summary: 'food only', rawTags: [] })
        ]
      })
    })
    const payload = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(webhookFetch).toHaveBeenCalledTimes(1)
    expect(payload.data.sent).toBe(1)
  })

  test('skips push when all items are filtered out', async () => {
    // Arrange
    const database = createInMemoryDatabase()
    const settingsRepository = createSettingsRepository(database)
    settingsRepository.save({
      ...BASE_SETTINGS,
      feishuWebhookUrl: 'https://example.com/feishu',
      excludeKeywords: ['spam']
    })

    const webhookFetch = vi.fn()

    const app = createServer({ settingsRepository, fetchImplementation: webhookFetch as typeof fetch })

    activeServer = await new Promise<Server>((resolve) => {
      const server = app.listen(0, TEST_HOST, () => {
        resolve(server)
      })
    })

    const address = activeServer.address() as AddressInfo | string | null

    if (!address || typeof address === 'string') {
      throw new Error('Expected server to listen on a TCP port')
    }

    // Act
    const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.pushFeishu}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [
          createFeedItem({ id: '1', title: 'Spam repo', summary: 'spam content' })
        ]
      })
    })
    const payload = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(webhookFetch).not.toHaveBeenCalled()
    expect(payload.data.sent).toBe(0)
  })

  test('returns error when webhook POST fails', async () => {
    // Arrange
    const database = createInMemoryDatabase()
    const settingsRepository = createSettingsRepository(database)
    settingsRepository.save({
      ...BASE_SETTINGS,
      feishuWebhookUrl: 'https://example.com/feishu'
    })

    const webhookFetch = vi.fn().mockResolvedValue(new Response('error', { status: 500 }))

    const app = createServer({ settingsRepository, fetchImplementation: webhookFetch as typeof fetch })

    activeServer = await new Promise<Server>((resolve) => {
      const server = app.listen(0, TEST_HOST, () => {
        resolve(server)
      })
    })

    const address = activeServer.address() as AddressInfo | string | null

    if (!address || typeof address === 'string') {
      throw new Error('Expected server to listen on a TCP port')
    }

    // Act
    const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.pushFeishu}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items: [createFeedItem()] })
    })
    const payload = await response.json()

    // Assert
    expect(response.status).toBe(502)
    expect(payload).toEqual({
      success: false,
      data: null,
      error: 'webhook delivery failed: HTTP 500'
    })
  })

  test('returns error when webhook fetch throws network error', async () => {
    // Arrange
    const database = createInMemoryDatabase()
    const settingsRepository = createSettingsRepository(database)
    settingsRepository.save({
      ...BASE_SETTINGS,
      feishuWebhookUrl: 'https://example.com/feishu'
    })

    const webhookFetch = vi.fn().mockRejectedValue(new Error('network error'))

    const app = createServer({ settingsRepository, fetchImplementation: webhookFetch as typeof fetch })

    activeServer = await new Promise<Server>((resolve) => {
      const server = app.listen(0, TEST_HOST, () => {
        resolve(server)
      })
    })

    const address = activeServer.address() as AddressInfo | string | null

    if (!address || typeof address === 'string') {
      throw new Error('Expected server to listen on a TCP port')
    }

    // Act
    const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.pushFeishu}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items: [createFeedItem()] })
    })
    const payload = await response.json()

    // Assert
    expect(response.status).toBe(502)
    expect(payload).toEqual({
      success: false,
      data: null,
      error: 'webhook delivery failed'
    })
  })
})