import { feedItemSchema, type FeedItem, type Platform } from '@ai-hot/shared'

import type { SqliteDatabase } from './client'
import { FEED_TABLE_SQL } from './schema'

type FeedRow = {
  id: string
  platform: Platform
  title: string
  summary: string
  url: string
  author: string
  published_at: string
  popularity_score: number
  growth_score: number
  raw_tags: string
  source_id: string
  collected_date: string
}

const getCollectedDate = (): string => new Date().toISOString().slice(0, 10)

const mapFeedItemToRow = (item: FeedItem, collectedDate: string): FeedRow => ({
  id: item.id,
  platform: item.platform,
  title: item.title,
  summary: item.summary,
  url: item.url,
  author: item.author,
  published_at: item.publishedAt,
  popularity_score: item.popularityScore,
  growth_score: item.growthScore,
  raw_tags: JSON.stringify(item.rawTags),
  source_id: item.sourceId,
  collected_date: collectedDate
})

const mapRowToFeedItem = (row: FeedRow): FeedItem => {
  const parsedRawTags: unknown = JSON.parse(row.raw_tags)

  return feedItemSchema.parse({
    id: row.id,
    platform: row.platform,
    title: row.title,
    summary: row.summary,
    url: row.url,
    author: row.author,
    publishedAt: row.published_at,
    popularityScore: row.popularity_score,
    growthScore: row.growth_score,
    rawTags: parsedRawTags,
    sourceId: row.source_id
  })
}

export { FEED_TABLE_SQL }

export const createFeedRepository = (database: SqliteDatabase) => {
  database.exec(FEED_TABLE_SQL)

  return {
    replaceTodayFeed(items: FeedItem[]): void {
      const collectedDate = getCollectedDate()
      const deleteStatement = database.prepare(
        'DELETE FROM feed_items WHERE collected_date = ?'
      )
      const insertStatement = database.prepare(
        `INSERT INTO feed_items (
          id,
          platform,
          title,
          summary,
          url,
          author,
          published_at,
          popularity_score,
          growth_score,
          raw_tags,
          source_id,
          collected_date
        ) VALUES (
          @id,
          @platform,
          @title,
          @summary,
          @url,
          @author,
          @published_at,
          @popularity_score,
          @growth_score,
          @raw_tags,
          @source_id,
          @collected_date
        )`
      )

      const transaction = database.transaction((feedItems: FeedItem[]) => {
        deleteStatement.run(collectedDate)

        for (const item of feedItems) {
          insertStatement.run(mapFeedItemToRow(item, collectedDate))
        }
      })

      transaction(items)
    },

    getTodayFeedByPlatform(platform: Platform): FeedItem[] {
      const collectedDate = getCollectedDate()
      const rows = database
        .prepare(
          `SELECT
            id,
            platform,
            title,
            summary,
            url,
            author,
            published_at,
            popularity_score,
            growth_score,
            raw_tags,
            source_id,
            collected_date
          FROM feed_items
          WHERE platform = ? AND collected_date = ?
          ORDER BY popularity_score DESC`
        )
        .all(platform, collectedDate) as FeedRow[]

      return rows.map(mapRowToFeedItem)
    }
  }
}
