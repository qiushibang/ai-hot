import type { AddressInfo, Server } from 'node:net'

import { API_ROUTES } from '@ai-hot/shared'
import { afterEach, describe, expect, test } from 'vitest'

import { createInMemoryDatabase } from '../../apps/companion-service/src/db/client'
import { createFavoritesRepository } from '../../apps/companion-service/src/db/favoritesRepository'
import { createServer } from '../../apps/companion-service/src/server/createServer'

const TEST_HOST = '127.0.0.1'

describe('companion service favorites routes', () => {
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

  test('creates and lists persisted favorites', async () => {
    // Arrange
    const database = createInMemoryDatabase()
    const app = createServer({
      favoritesRepository: createFavoritesRepository(database)
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
    const createResponse = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.favorites}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ itemId: 'github:1' })
    })
    const createdPayload = await createResponse.json()
    const listResponse = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.favorites}`)
    const listPayload = await listResponse.json()

    // Assert
    expect(createResponse.status).toBe(200)
    expect(createdPayload).toEqual({
      success: true,
      data: { itemId: 'github:1' },
      error: null
    })
    expect(listResponse.status).toBe(200)
    expect(listPayload).toEqual({
      success: true,
      data: [{ itemId: 'github:1' }],
      error: null
    })
  })

  test('rejects invalid favorite payloads', async () => {
    // Arrange
    const database = createInMemoryDatabase()
    const app = createServer({
      favoritesRepository: createFavoritesRepository(database)
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
    const response = await fetch(`http://${TEST_HOST}:${address.port}${API_ROUTES.favorites}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ itemId: '' })
    })
    const payload = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(payload).toEqual({
      success: false,
      data: null,
      error: 'favorite itemId is required'
    })
  })
})
