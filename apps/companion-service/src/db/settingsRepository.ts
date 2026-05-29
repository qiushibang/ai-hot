import { createDefaultSettings, settingsSchema, type Settings } from '@ai-hot/shared'

import type { SqliteDatabase } from './client'

const SETTINGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  )
`

const SETTINGS_ROW_ID = 'default'

type SettingsRow = {
  payload: string
}

const parseSettingsPayload = (payload: string): Settings => {
  const parsedPayload: unknown = JSON.parse(payload)

  return settingsSchema.parse({ ...createDefaultSettings(), ...(parsedPayload as Record<string, unknown>) })
}

export const createSettingsRepository = (database: SqliteDatabase) => {
  database.exec(SETTINGS_TABLE_SQL)

  return {
    get(): Settings | null {
      const row = database
        .prepare('SELECT payload FROM app_settings WHERE id = ?')
        .get(SETTINGS_ROW_ID) as SettingsRow | undefined

      if (!row) {
        return null
      }

      return parseSettingsPayload(row.payload)
    },

    save(settings: Settings): void {
      const validSettings = settingsSchema.parse(settings)

      database
        .prepare(
          `INSERT INTO app_settings (id, payload)
           VALUES (@id, @payload)
           ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`
        )
        .run({
          id: SETTINGS_ROW_ID,
          payload: JSON.stringify(validSettings)
        })
    }
  }
}
