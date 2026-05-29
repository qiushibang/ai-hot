import type { SqliteDatabase } from './client'
import { COOKIES_TABLE_SQL } from './schema'

export const createCookiesRepository = (database: SqliteDatabase) => {
  database.exec(COOKIES_TABLE_SQL)

  const upsertStatement = database.prepare(
    `INSERT INTO cookies (platform, cookie_string, extracted_at)
     VALUES (@platform, @cookie_string, @extracted_at)
     ON CONFLICT(platform) DO UPDATE SET
       cookie_string = excluded.cookie_string,
       extracted_at = excluded.extracted_at`
  )

  const getStatement = database.prepare(
    'SELECT cookie_string FROM cookies WHERE platform = ?'
  )

  return {
    save(platform: string, cookieString: string): void {
      upsertStatement.run({
        platform,
        cookie_string: cookieString,
        extracted_at: new Date().toISOString()
      })
    },

    get(platform: string): string | null {
      const row = getStatement.get(platform) as { cookie_string: string } | undefined
      return row?.cookie_string ?? null
    }
  }
}