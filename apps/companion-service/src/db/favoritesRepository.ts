import { favoriteSchema, favoritesSchema, type Favorite } from '@ai-hot/shared'

import type { SqliteDatabase } from './client'

const FAVORITES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS favorites (
    item_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
  )
`

type FavoriteRow = {
  item_id: string
}

const mapRowToFavorite = (row: FavoriteRow): Favorite => {
  return favoriteSchema.parse({
    itemId: row.item_id
  })
}

export const createFavoritesRepository = (database: SqliteDatabase) => {
  database.exec(FAVORITES_TABLE_SQL)

  return {
    list(): Favorite[] {
      const rows = database
        .prepare('SELECT item_id FROM favorites ORDER BY created_at DESC')
        .all() as FavoriteRow[]

      return favoritesSchema.parse(rows.map(mapRowToFavorite))
    },

    add(itemId: string): Favorite {
      const favorite = favoriteSchema.parse({ itemId })

      database
        .prepare(
          `INSERT INTO favorites (item_id, created_at)
           VALUES (@item_id, @created_at)
           ON CONFLICT(item_id) DO NOTHING`
        )
        .run({
          item_id: favorite.itemId,
          created_at: new Date().toISOString()
        })

      return favorite
    },

    remove(itemId: string): boolean {
      const result = database
        .prepare('DELETE FROM favorites WHERE item_id = ?')
        .run(itemId)

      return result.changes > 0
    }
  }
}
