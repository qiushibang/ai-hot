import type { AddressInfo, Server } from 'node:net'

import { API_ROUTES, createDefaultSettings, type Settings } from '@ai-hot/shared'
import { afterEach, describe, expect, test } from 'vitest'

import { createInMemoryDatabase } from '../../apps/companion-service/src/db/client'
import { createSettingsRepository } from '../../apps/companion-service/src/db/settingsRepository'
import { createServer } from '../../apps/companion-service/src/server/createServer'

const TEST_HOST = '127.0.0.1'
const DEFAULT_SETTINGS: Settings = createDefaultSettings()

const createSettings = (overrides: Partial<Settings> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  ...overrides
})

describe('companion service settings routes', () => {
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

  test('returns default settings and persists valid updates', async () => {
    // Arrange
    const database = createInMemoryDatabase()
    const app = createServer({
      settingsRepository: createSettingsRepository(database)
    })

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
    const initialResponse = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.settings}`)
    const initialPayload = await initialResponse.json()
    const nextSettings = createSettings({
      includeKeywords: ['agent'],
      enabledPlatforms: ['github'],
      feishuWebhookUrl: 'https://example.com/feishu'
    })
    const saveResponse = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.settings}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nextSettings)
    })
    const savePayload = await saveResponse.json()
    const finalResponse = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.settings}`)
    const finalPayload = await finalResponse.json()

    // Assert
    expect(initialResponse.status).toBe(200)
    expect(initialPayload).toEqual({
      success: true,
      data: DEFAULT_SETTINGS,
      error: null
    })
    expect(saveResponse.status).toBe(200)
    expect(savePayload).toEqual({
      success: true,
      data: nextSettings,
      error: null
    })
    expect(finalResponse.status).toBe(200)
    expect(finalPayload).toEqual({
      success: true,
      data: nextSettings,
      error: null
    })
  })

  test('rejects invalid settings payloads', async () => {
    // Arrange
    const database = createInMemoryDatabase()
    const app = createServer({
      settingsRepository: createSettingsRepository(database)
    })

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
    const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.settings}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        includeKeywords: [],
        excludeKeywords: [],
        enabledPlatforms: ['github'],
        feishuWebhookUrl: 'not-a-url',
        wechatWebhookUrl: null
      })
    })
    const payload = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(payload).toEqual({
      success: false,
      data: null,
      error: 'settings payload is invalid'
    })
  })
})
