import type { AddressInfo, Server } from 'node:net'

import { API_ROUTES, type PlatformStatus } from '@ai-hot/shared'
import { afterEach, describe, expect, test } from 'vitest'

import { createServer } from '../../apps/companion-service/src/server/createServer'

const TEST_HOST = '127.0.0.1'

const createPlatformStatus = (overrides: Partial<PlatformStatus> = {}): PlatformStatus => ({
  platform: 'x',
  state: 'not_logged_in',
  detail: '当前浏览器未登录该平台',
  lastUpdatedAt: '2026-05-23T10:00:00.000Z',
  lastCollectedAt: null,
  ...overrides
})

describe('companion service status route', () => {
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

  test('creates an express app with JSON middleware and returns ok status payload', async () => {
    // Arrange
    const app = createServer()

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
    const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.status}`)
    const payload = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        status: 'ok'
      },
      error: null
    })
  })

  test('returns persisted platform statuses', async () => {
    // Arrange
    const app = createServer({
      platformStatusRepository: {
        getAll() {
          return [
            createPlatformStatus(),
            createPlatformStatus({
              platform: 'youtube',
              state: 'ready',
              detail: null,
              lastCollectedAt: '2026-05-23T11:00:00.000Z'
            })
          ]
        },
        replaceAll: () => {}
      }
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
    const response = await fetch(
      `http://${TEST_HOST}:${address.port}${API_ROUTES.platformStatuses}`
    )
    const payload = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: [
        createPlatformStatus(),
        createPlatformStatus({
          platform: 'youtube',
          state: 'ready',
          detail: null,
          lastCollectedAt: '2026-05-23T11:00:00.000Z'
        })
      ],
      error: null
    })
  })

  test.each([
    'http://127.0.0.1:4173',
    'http://localhost:4173',
    'http://127.0.0.1:4174',
    'http://localhost:4174'
  ])(
    'allows the local new-tab origin %s to read the status payload',
    async (origin) => {
      // Arrange
      const app = createServer()

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
      const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.status}`, {
        headers: {
          Origin: origin
        }
      })

      // Assert
      expect(response.status).toBe(200)
      expect(response.headers.get('access-control-allow-origin')).toBe(origin)
    }
  )

  test('does not allow non-local origins to read the status payload', async () => {
    // Arrange
    const app = createServer()

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
    const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.status}`, {
      headers: {
        Origin: 'https://example.com'
      }
    })

    // Assert
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })
})
