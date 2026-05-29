import { describe, expect, test } from 'vitest'
import { ZodError } from 'zod'

import type { FeedItem, Settings } from '@ai-hot/shared'
import { createDefaultSettings } from '@ai-hot/shared'
import { createInMemoryDatabase } from '../../apps/companion-service/src/db/client'
import {
  FEED_TABLE_SQL,
  createFeedRepository
} from '../../apps/companion-service/src/db/feedRepository'
import { createSettingsRepository } from '../../apps/companion-service/src/db/settingsRepository'

const createFeedItem = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  id: 'item-1',
  platform: 'github',
  title: 'New AI release',
  summary: 'A concise summary',
  url: 'https://example.com/items/1',
  author: 'Alice',
  publishedAt: '2026-05-21T10:00:00.000Z',
  popularityScore: 42,
  growthScore: 7,
  rawTags: ['ai', 'release'],
  sourceId: 'source-1',
  ...overrides
})

const createSettings = (overrides: Partial<Settings> = {}): Settings => ({
  ...createDefaultSettings(),
  includeKeywords: ['ai'],
  excludeKeywords: ['spam'],
  enabledPlatforms: ['github', 'x'],
  feishuWebhookUrl: 'https://example.com/feishu',
  wechatWebhookUrl: null,
  ...overrides
})

describe('feed repository', () => {
  test('exports feed table schema for feed_items', () => {
    expect(FEED_TABLE_SQL).toContain('CREATE TABLE IF NOT EXISTS feed_items')
    expect(FEED_TABLE_SQL).toContain('id TEXT NOT NULL')
    expect(FEED_TABLE_SQL).toContain('platform TEXT NOT NULL')
    expect(FEED_TABLE_SQL).toContain('title TEXT NOT NULL')
    expect(FEED_TABLE_SQL).toContain('summary TEXT NOT NULL')
    expect(FEED_TABLE_SQL).toContain('url TEXT NOT NULL')
    expect(FEED_TABLE_SQL).toContain('author TEXT NOT NULL')
    expect(FEED_TABLE_SQL).toContain('published_at TEXT NOT NULL')
    expect(FEED_TABLE_SQL).toContain('popularity_score REAL NOT NULL')
    expect(FEED_TABLE_SQL).toContain('growth_score REAL NOT NULL')
    expect(FEED_TABLE_SQL).toContain('raw_tags TEXT NOT NULL')
    expect(FEED_TABLE_SQL).toContain('source_id TEXT NOT NULL')
    expect(FEED_TABLE_SQL).toContain('collected_date TEXT NOT NULL')
  })

  test('ensures schema exists when repository is created', () => {
    const database = createInMemoryDatabase()

    createFeedRepository(database)

    const row = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'feed_items'"
      )
      .get() as { name: string } | undefined

    expect(row).toEqual({ name: 'feed_items' })
  })

  test('replaces only today rows and returns today feed ordered by popularity score', () => {
    const database = createInMemoryDatabase()
    const repository = createFeedRepository(database)

    database.exec(FEED_TABLE_SQL)
    database
      .prepare(
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
      .run({
        id: 'yesterday-item',
        platform: 'github',
        title: 'Yesterday',
        summary: 'Older summary',
        url: 'https://example.com/yesterday',
        author: 'Bob',
        published_at: '2026-05-20T10:00:00.000Z',
        popularity_score: 10,
        growth_score: 2,
        raw_tags: JSON.stringify(['old']),
        source_id: 'source-old',
        collected_date: '1999-12-31'
      })

    repository.replaceTodayFeed([
      createFeedItem(),
      createFeedItem({
        id: 'item-2',
        title: 'Most popular item',
        url: 'https://example.com/items/2',
        popularityScore: 100,
        rawTags: ['featured', 'top'],
        sourceId: 'source-2'
      }),
      createFeedItem({
        id: 'item-3',
        platform: 'x',
        title: 'Other platform item',
        url: 'https://example.com/items/3',
        popularityScore: 50,
        rawTags: ['social'],
        sourceId: 'source-3'
      })
    ])

    const githubItems = repository.getTodayFeedByPlatform('github')
    const xItems = repository.getTodayFeedByPlatform('x')
    const storedTags = database
      .prepare('SELECT raw_tags FROM feed_items WHERE id = ?')
      .get('item-2') as { raw_tags: string }
    const yesterdayCount = database
      .prepare('SELECT COUNT(*) as count FROM feed_items WHERE collected_date = ?')
      .get('1999-12-31') as { count: number }

    expect(githubItems).toEqual([
      createFeedItem({
        id: 'item-2',
        title: 'Most popular item',
        url: 'https://example.com/items/2',
        popularityScore: 100,
        rawTags: ['featured', 'top'],
        sourceId: 'source-2'
      }),
      createFeedItem()
    ])
    expect(xItems).toEqual([
      createFeedItem({
        id: 'item-3',
        platform: 'x',
        title: 'Other platform item',
        url: 'https://example.com/items/3',
        popularityScore: 50,
        rawTags: ['social'],
        sourceId: 'source-3'
      })
    ])
    expect(storedTags).toEqual({ raw_tags: JSON.stringify(['featured', 'top']) })
    expect(yesterdayCount).toEqual({ count: 1 })
  })

  test('throws when stored raw_tags JSON does not match the shared feed schema', () => {
    const database = createInMemoryDatabase()
    const repository = createFeedRepository(database)

    database
      .prepare(
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
      .run({
        id: 'invalid-tags',
        platform: 'github',
        title: 'Broken tags row',
        summary: 'This row should fail validation',
        url: 'https://example.com/broken-tags',
        author: 'Alice',
        published_at: '2026-05-21T10:00:00.000Z',
        popularity_score: 1,
        growth_score: 1,
        raw_tags: JSON.stringify([1, 2, 3]),
        source_id: 'source-invalid',
        collected_date: new Date().toISOString().slice(0, 10)
      })

    expect(() => repository.getTodayFeedByPlatform('github')).toThrow(ZodError)
  })

  test('persists and validates settings through the shared settings schema', () => {
    const database = createInMemoryDatabase()
    const repository = createSettingsRepository(database)
    const settings = createSettings()

    repository.save(settings)

    const loadedSettings = repository.get()
    const storedRow = database
      .prepare('SELECT payload FROM app_settings WHERE id = ?')
      .get('default') as { payload: string }

    expect(loadedSettings).toEqual(settings)
    expect(JSON.parse(storedRow.payload)).toEqual(settings)
  })

  test('throws when stored settings payload does not match the shared schema', () => {
    const database = createInMemoryDatabase()
    const repository = createSettingsRepository(database)

    database
      .prepare('INSERT INTO app_settings (id, payload) VALUES (?, ?)')
      .run(
        'default',
        JSON.stringify({
          includeKeywords: ['ai'],
          excludeKeywords: ['spam'],
          enabledPlatforms: ['github'],
          feishuWebhookUrl: 'not-a-url',
          wechatWebhookUrl: null
        })
      )

    expect(() => repository.get()).toThrow(ZodError)
  })
})
