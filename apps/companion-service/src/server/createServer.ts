import express from 'express'

import { createFavoritesRouter, type FavoritesRepository } from './routes/favorites'
import {
  createFeedRouter,
  type FeedRepository,
  type PlatformStatusRepository
} from './routes/feed'
import { createPushRouter } from './routes/push'
import { createSettingsRouter, type SettingsRepository } from './routes/settings'
import { createStatusRouter } from './routes/status'

const ALLOWED_ORIGINS = new Set([
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'http://127.0.0.1:4174',
  'http://localhost:4174',
  'http://127.0.0.1:4175',
  'http://localhost:4175'
])

type CreateServerDependencies = {
  favoritesRepository?: FavoritesRepository
  feedRepository?: FeedRepository
  platformStatusRepository?: PlatformStatusRepository
  settingsRepository?: SettingsRepository
  // eslint-disable-next-line no-unused-vars
  collectFeed?: (_searchQuery: string) => Promise<{
    platformBuckets: Record<string, import('@ai-hot/shared').FeedItem[]>
    platformStatuses: import('@ai-hot/shared').PlatformStatus[]
  }>
  fetchImplementation?: typeof fetch
}

export const createServer = ({
  favoritesRepository,
  feedRepository,
  platformStatusRepository,
  settingsRepository,
  collectFeed,
  fetchImplementation
}: CreateServerDependencies = {}) => {
  const app = express()

  app.use((request, response, next) => {
    const origin = request.headers.origin

    if (origin && ALLOWED_ORIGINS.has(origin)) {
      response.header('Access-Control-Allow-Origin', origin)
      response.header('Vary', 'Origin')
    }

    if (request.method === 'OPTIONS') {
      response.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.status(204).end()
      return
    }

    next()
  })
  app.use(express.json())
  app.use(createStatusRouter(platformStatusRepository))
  app.use(createFeedRouter({ feedRepository, platformStatusRepository, collectFeed }))
  app.use(createFavoritesRouter(favoritesRepository))
  app.use(createSettingsRouter(settingsRepository))
  app.use(createPushRouter(settingsRepository, { fetchImplementation }))

  return app
}
