import type { FeedItem } from '@ai-hot/shared'
import { describe, expect, test } from 'vitest'

import { dedupeItems } from '../../apps/companion-service/src/feed/dedupeItems'
import { normalizeItem } from '../../apps/companion-service/src/feed/normalizeItem'
import { rankItems } from '../../apps/companion-service/src/feed/rankItems'

const createFeedItem = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  id: 'item-1',
  platform: 'github',
  title: '  AI launch  ',
  summary: '  Useful summary  ',
  url: 'https://example.com/item-1',
  author: 'octocat',
  publishedAt: '2026-05-21T10:00:00.000Z',
  popularityScore: 10,
  growthScore: 2,
  rawTags: ['  ai  ', '', 'ranking'],
  sourceId: 'source-1',
  ...overrides
})

describe('ranking pipeline utilities', () => {
  test('normalizes fields, removes duplicates by source, and ranks higher score plus recency first', () => {
    // Arrange
    const duplicateOlderItem = createFeedItem({
      id: 'duplicate-older',
      title: '  Duplicate older  ',
      summary: '  Older duplicate summary  ',
      sourceId: 'shared-source',
      popularityScore: 12,
      growthScore: 3,
      publishedAt: '2026-05-20T12:00:00.000Z'
    })
    const duplicateNewerItem = createFeedItem({
      id: 'duplicate-newer',
      title: '  Duplicate newer  ',
      summary: '  Newer duplicate summary  ',
      sourceId: 'shared-source',
      popularityScore: 12,
      growthScore: 3,
      publishedAt: '2026-05-21T12:00:00.000Z'
    })
    const highScoreItem = createFeedItem({
      id: 'high-score',
      title: '  Highest total score  ',
      summary: '  Highest total score summary  ',
      sourceId: 'high-score-source',
      popularityScore: 20,
      growthScore: 5,
      publishedAt: '2026-05-19T12:00:00.000Z'
    })
    const recentTieBreakerItem = createFeedItem({
      id: 'recent-tiebreaker',
      title: '  Recent tie breaker  ',
      summary: '  Recent tie breaker summary  ',
      sourceId: 'recent-source',
      popularityScore: 14,
      growthScore: 3,
      publishedAt: '2026-05-21T15:00:00.000Z'
    })

    // Act
    const normalizedItems = [
      duplicateOlderItem,
      duplicateNewerItem,
      highScoreItem,
      recentTieBreakerItem
    ].map(normalizeItem)
    const uniqueItems = dedupeItems(normalizedItems)
    const rankedItems = rankItems(uniqueItems)

    // Assert
    expect(normalizedItems[0]).toEqual({
      ...duplicateOlderItem,
      title: 'Duplicate older',
      summary: 'Older duplicate summary',
      rawTags: ['ai', 'ranking']
    })
    expect(uniqueItems.map((item) => item.id)).toEqual([
      'duplicate-newer',
      'high-score',
      'recent-tiebreaker'
    ])
    expect(rankedItems.map((item) => item.id)).toEqual([
      'high-score',
      'recent-tiebreaker',
      'duplicate-newer'
    ])
  })

  test('breaks equal ranking scores deterministically by source id', () => {
    // Arrange
    const sameScoreLaterSource = createFeedItem({
      id: 'same-score-z',
      sourceId: 'z-source',
      publishedAt: '2026-05-21T10:00:00.000Z',
      popularityScore: 8,
      growthScore: 4
    })
    const sameScoreEarlierSource = createFeedItem({
      id: 'same-score-a',
      sourceId: 'a-source',
      publishedAt: '2026-05-21T10:00:00.000Z',
      popularityScore: 8,
      growthScore: 4
    })

    // Act
    const rankedItems = rankItems([sameScoreLaterSource, sameScoreEarlierSource])

    // Assert
    expect(rankedItems.map((item) => item.id)).toEqual(['same-score-a', 'same-score-z'])
  })
})
