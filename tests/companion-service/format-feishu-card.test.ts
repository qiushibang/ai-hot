import type { FeedItem } from '@ai-hot/shared'
import { describe, expect, test } from 'vitest'

import { createFeishuCardFormatter } from '../../apps/companion-service/src/server/push/formatFeishuCard'

const createItem = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  id: 'github:1',
  platform: 'github',
  title: 'Test Repo',
  summary: 'A short summary',
  url: 'https://example.com/1',
  author: 'alice',
  publishedAt: '2026-05-21T00:00:00.000Z',
  popularityScore: 10,
  growthScore: 5,
  rawTags: ['ai'],
  sourceId: '1',
  ...overrides
})

const findItemDivs = (elements: Array<{ tag: string }>) =>
  elements.filter((el) => el.tag === 'div' && 'text' in el)

describe('formatFeishuCard', () => {
  test('builds an interactive card with blue template', () => {
    const format = createFeishuCardFormatter()
    const card = format([createItem()], 'AI')

    expect(card.msg_type).toBe('interactive')
    expect(card.card.header.template).toBe('blue')
    expect(card.card.header.title.tag).toBe('plain_text')
  })

  test('uses search query in header title', () => {
    const format = createFeishuCardFormatter()
    const card = format([createItem()], 'agent')

    expect(card.card.header.title.content).toBe('AI Hot: agent')
  })

  test('falls back to default title when search query is empty', () => {
    const format = createFeishuCardFormatter()
    const card = format([createItem()], '')

    expect(card.card.header.title.content).toBe('AI Hot: 今日热点')
  })

  test('falls back to default title when search query is whitespace only', () => {
    const format = createFeishuCardFormatter()
    const card = format([createItem()], '   ')

    expect(card.card.header.title.content).toBe('AI Hot: 今日热点')
  })

  test('renders item title as a markdown link', () => {
    const format = createFeishuCardFormatter()
    const card = format([createItem({ title: 'My Project', url: 'https://x.com/1' })], 'ai')

    const itemDivs = findItemDivs(card.card.elements)
    const content = itemDivs.map((el) => ('text' in el ? (el as { text: { content: string } }).text.content : '')).join('\n')

    expect(content).toContain('[My Project](https://x.com/1)')
  })

  test('groups items by platform with section headers', () => {
    const format = createFeishuCardFormatter()
    const items = [
      createItem({ id: 'github:1', platform: 'github', title: 'GH Repo', url: 'https://gh.com' }),
      createItem({ id: 'x:1', platform: 'x', title: 'Tweet', url: 'https://x.com' })
    ]
    const card = format(items, 'ai')

    const headerDivs = card.card.elements.filter(
      (el) => el.tag === 'div' && 'text' in el && (el as { text: { content: string } }).text.content.startsWith('**GitHub**')
    )

    expect(headerDivs.length).toBeGreaterThan(0)
    expect(card.card.elements.some((el) => el.tag === 'hr')).toBe(true)
  })

  test('does not include scores in item elements', () => {
    const format = createFeishuCardFormatter()
    const card = format([createItem({ popularityScore: 42, growthScore: 7 })], 'ai')

    const itemDivs = findItemDivs(card.card.elements)
    const content = itemDivs.map((el) => ('text' in el ? (el as { text: { content: string } }).text.content : '')).join('\n')

    expect(content).not.toContain('热度:')
    expect(content).not.toContain('增长:')
  })

  test('truncates summary to 80 characters', () => {
    const format = createFeishuCardFormatter()
    const longSummary = 'A'.repeat(150)
    const card = format([createItem({ summary: longSummary })], 'ai')

    const itemDivs = findItemDivs(card.card.elements)
    const content = itemDivs.map((el) => ('text' in el ? (el as { text: { content: string } }).text.content : '')).join('\n')

    expect(content).toContain('A'.repeat(80) + '...')
    expect(content).not.toContain('A'.repeat(81))
  })

  test('caps items at maxItems', () => {
    const format = createFeishuCardFormatter({ maxItems: 3 })
    const items = Array.from({ length: 5 }, (_, i) =>
      createItem({ id: `github:${i}`, platform: 'github', title: `Repo ${i}`, url: `https://example.com/${i}` })
    )
    const card = format(items, 'ai')

    const itemDivs = findItemDivs(card.card.elements)
    // 1 header + 3 items = 4 divs (hr and note are separate)
    const itemContentDivs = itemDivs.filter(
      (el) => ((el as unknown) as { text: { content: string } }).text.content.includes('](http')
    )

    expect(itemContentDivs.length).toBeLessThanOrEqual(3)
  })

  test('footer note shows total count', () => {
    const format = createFeishuCardFormatter()
    const items = [createItem(), createItem({ id: 'github:2', title: 'Repo 2', url: 'https://e.com/2' })]
    const card = format(items, 'ai')

    const note = card.card.elements.find((el) => el.tag === 'note')

    expect(note).toBeDefined()
    expect(note!['elements'][0].content).toContain('共 2 条')
  })

  test('handles empty items array', () => {
    const format = createFeishuCardFormatter()
    const card = format([], 'ai')

    expect(card.card.elements).toHaveLength(0)
  })
})