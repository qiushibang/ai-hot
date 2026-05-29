import { mkdir } from 'node:fs/promises'

import { collectTodayFeed } from '../apps/companion-service/src/feed/collectTodayFeed'
import { createFileDatabase } from '../apps/companion-service/src/db/client'
import { createCookiesRepository } from '../apps/companion-service/src/db/cookiesRepository'
import {
  COMPANION_SERVICE_DATA_DIRECTORY,
  COMPANION_SERVICE_DATABASE_PATH
} from '../apps/companion-service/src/db/databasePath'
import { createFeedRepository } from '../apps/companion-service/src/db/feedRepository'
import { createPlatformStatusRepository } from '../apps/companion-service/src/db/platformStatusRepository'
import { summarizeItems } from '../apps/companion-service/src/feed/summarizeItems'
import { runDailyUpdate } from '../apps/companion-service/src/scheduler/runDailyUpdate'

const main = async () => {
  await mkdir(COMPANION_SERVICE_DATA_DIRECTORY, { recursive: true })

  const database = createFileDatabase(COMPANION_SERVICE_DATABASE_PATH)
  const { replaceTodayFeed } = createFeedRepository(database)
  const { replaceAll: replacePlatformStatuses } = createPlatformStatusRepository(database)
  const cookiesRepository = createCookiesRepository(database)

  try {
    const { items, platformStatuses } = await runDailyUpdate({
      collectTodayFeed: () => collectTodayFeed({ cookiesRepository }),
      summarizeItems,
      replaceTodayFeed,
      replacePlatformStatuses
    })

    console.info(
      `Persisted ${items.length} items and ${platformStatuses.length} platform statuses to ${COMPANION_SERVICE_DATABASE_PATH}`
    )
  } finally {
    database.close()
  }
}

void main()
