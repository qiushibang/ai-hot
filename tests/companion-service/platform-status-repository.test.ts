import { describe, expect, test } from 'vitest'
import type { PlatformStatus } from '@ai-hot/shared'

import { createInMemoryDatabase } from '../../apps/companion-service/src/db/client'
import { createPlatformStatusRepository } from '../../apps/companion-service/src/db/platformStatusRepository'

describe('platformStatusRepository', () => {
  test('saves and returns the latest platform statuses', () => {
    const database = createInMemoryDatabase()
    const repository = createPlatformStatusRepository(database)

    const statuses: PlatformStatus[] = [
      {
        platform: 'x',
        state: 'not_logged_in',
        detail: '当前浏览器未登录该平台',
        lastUpdatedAt: '2026-05-23T10:00:00.000Z',
        lastCollectedAt: null
      }
    ]

    repository.replaceAll(statuses)

    expect(repository.getAll()).toEqual(statuses)
  })
})
