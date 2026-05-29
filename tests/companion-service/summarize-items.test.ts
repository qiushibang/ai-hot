import { describe, expect, test } from 'vitest'

import { summarizeItems } from '../../apps/companion-service/src/feed/summarizeItems'

describe('summarizeItems', () => {
  test('caps summary length to 80 characters for new-tab cards', async () => {
    // Arrange
    const longSummary = '1234567890'.repeat(9)
    const items = [
      {
        id: 'item-1',
        summary: longSummary
      }
    ]

    // Act
    const summarizedItems = await summarizeItems(items)

    // Assert
    expect(summarizedItems).toEqual([
      {
        id: 'item-1',
        summary: longSummary.slice(0, 80)
      }
    ])
    expect(summarizedItems[0]?.summary).toHaveLength(80)
    expect(items[0]?.summary).toBe(longSummary)
  })
})
