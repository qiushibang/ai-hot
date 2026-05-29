import { platformStatusSchema, type PlatformStatus } from '@ai-hot/shared'

import type { SqliteDatabase } from './client'
import { PLATFORM_STATUS_TABLE_SQL } from './schema'

type PlatformStatusRow = {
  platform: string
  state: string
  detail: string | null
  last_updated_at: string | null
  last_collected_at: string | null
}

const mapStatusToRow = (status: PlatformStatus): PlatformStatusRow => ({
  platform: status.platform,
  state: status.state,
  detail: status.detail,
  last_updated_at: status.lastUpdatedAt,
  last_collected_at: status.lastCollectedAt
})

const VALID_PLATFORMS = new Set(['github', 'x', 'youtube', 'huggingface'])

const mapRowToStatus = (row: PlatformStatusRow): PlatformStatus | null => {
  if (!VALID_PLATFORMS.has(row.platform)) {
    return null
  }

  return platformStatusSchema.parse({
    platform: row.platform,
    state: row.state,
    detail: row.detail,
    lastUpdatedAt: row.last_updated_at,
    lastCollectedAt: row.last_collected_at
  })
}

export const createPlatformStatusRepository = (database: SqliteDatabase) => {
  database.exec(PLATFORM_STATUS_TABLE_SQL)

  const deleteStatement = database.prepare('DELETE FROM platform_statuses')
  const insertStatement = database.prepare(
    `INSERT INTO platform_statuses (
      platform,
      state,
      detail,
      last_updated_at,
      last_collected_at
    ) VALUES (
      @platform,
      @state,
      @detail,
      @last_updated_at,
      @last_collected_at
    )`
  )
  const selectAllStatement = database.prepare(
    `SELECT platform, state, detail, last_updated_at, last_collected_at
     FROM platform_statuses
     ORDER BY platform ASC`
  )
  const replaceAllTransaction = database.transaction((statuses: PlatformStatus[]) => {
    deleteStatement.run()

    for (const status of statuses) {
      insertStatement.run(mapStatusToRow(status))
    }
  })

  return {
    replaceAll(statuses: PlatformStatus[]): void {
      replaceAllTransaction(statuses)
    },

    getAll(): PlatformStatus[] {
      const rows = selectAllStatement.all() as PlatformStatusRow[]

      return rows.map(mapRowToStatus).filter((s): s is PlatformStatus => s !== null)
    }
  }
}
