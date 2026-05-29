import type { Server } from 'node:http'
import { mkdirSync } from 'node:fs'

import { getCompanionServiceConfig } from './config'
import { createFileDatabase } from './db/client'
import {
  COMPANION_SERVICE_DATA_DIRECTORY,
  COMPANION_SERVICE_DATABASE_PATH
} from './db/databasePath'
import { createCookiesRepository } from './db/cookiesRepository'
import { createFavoritesRepository } from './db/favoritesRepository'
import { createFeedRepository } from './db/feedRepository'
import { createPlatformStatusRepository } from './db/platformStatusRepository'
import { createSettingsRepository } from './db/settingsRepository'
import { collectTodayFeed } from './feed/collectTodayFeed'
import { createServer } from './server/createServer'

export const startCompanionService = (): Server => {
  const { host, port } = getCompanionServiceConfig()

  mkdirSync(COMPANION_SERVICE_DATA_DIRECTORY, { recursive: true })

  const database = createFileDatabase(COMPANION_SERVICE_DATABASE_PATH)
  const feedRepository = createFeedRepository(database)
  const favoritesRepository = createFavoritesRepository(database)
  const platformStatusRepository = createPlatformStatusRepository(database)
  const settingsRepository = createSettingsRepository(database)
  const cookiesRepository = createCookiesRepository(database)

  const collectFeed = async (searchQuery: string) => {
    return collectTodayFeed({ cookiesRepository, searchQuery })
  }

  const app = createServer({
    favoritesRepository,
    feedRepository,
    platformStatusRepository,
    settingsRepository,
    collectFeed
  })
  const server = app.listen(port, host, () => {
    console.info(`Companion service listening on http://${host}:${port}`)
  })

  server.on('close', () => {
    database.close()
  })

  server.on('error', (error) => {
    console.error('Failed to start companion service', error)
    process.exitCode = 1
  })

  return server
}

startCompanionService()
