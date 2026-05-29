import type { FeedItem } from '@ai-hot/shared'
import { describe, expect, test } from 'vitest'

import { createWechatMessageFormatter } from '../../apps/companion-service/src/server/push/formatWechatMessage'

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

describe('formatWechatMessage', () => {
  test('builds a markdown message', () => {
    const format = createWechatMessageFormatter()
    const msg = format([createItem()], 'AI')

    expect(msg.msgtype).toBe('markdown')
    expect(typeof msg.markdown.content).toBe('string')
  })

  test('uses search query in heading', () => {
    const format = createWechatMessageFormatter()
    const msg = format([createItem()], 'agent')

    expect(msg.markdown.content).toContain('# AI Hot: agent')
  })

  test('falls back to default title when search query is empty', () => {
    const format = createWechatMessageFormatter()
    const msg = format([createItem()], '')

    expect(msg.markdown.content).toContain('# AI Hot: 今日热点')
  })

  test('falls back to default title when search query is whitespace only', () => {
    const format = createWechatMessageFormatter()
    const msg = format([createItem()], '   ')

    expect(msg.markdown.content).toContain('# AI Hot: 今日热点')
  })

  test('renders item as a markdown link with summary and score', () => {
    const format = createWechatMessageFormatter()
    const msg = format([createItem({ title: 'My Project', url: 'https://x.com/1', summary: 'desc', popularityScore: 42 })], 'ai')

    expect(msg.markdown.content).toContain('[My Project](https://x.com/1)')
    expect(msg.markdown.content).toContain('desc')
    expect(msg.markdown.content).toContain('热度:42')
  })

  test('truncates summary to 80 characters', () => {
    const format = createWechatMessageFormatter()
    const longSummary = 'A'.repeat(120)
    const msg = format([createItem({ summary: longSummary })], 'ai')

    expect(msg.markdown.content).toContain('A'.repeat(80) + '...')
    expect(msg.markdown.content).not.toContain('A'.repeat(81))
  })

  test('caps items at maxItems', () => {
    const format = createWechatMessageFormatter({ maxItems: 3 })
    const items = Array.from({ length: 5 }, (_, i) =>
      createItem({ id: `github:${i}`, title: `Repo ${i}`, url: `https://example.com/${i}`, summary: 's' })
    )
    const msg = format(items, 'ai')

    const linkCount = (msg.markdown.content.match(/\[Repo \d\]/g) ?? []).length
    expect(linkCount).toBe(3)
  })

  test('stops adding items when content exceeds maxContentLength', () => {
    const format = createWechatMessageFormatter({ maxContentLength: 200 })
    const items = Array.from({ length: 10 }, (_, i) =>
      createItem({
        id: `github:${i}`,
        title: `Repo ${i}`,
        url: `https://example.com/${i}`,
        summary: 'A'.repeat(80)
      })
    )
    const msg = format(items, 'ai')

    expect(msg.markdown.content.length).toBeLessThanOrEqual(200)
  })

  test('shows remaining count when some items are excluded', () => {
    const format = createWechatMessageFormatter({ maxItems: 2 })
    const items = Array.from({ length: 5 }, (_, i) =>
      createItem({ id: `github:${i}`, title: `Repo ${i}`, url: `https://example.com/${i}`, summary: 's' })
    )
    const msg = format(items, 'ai')

    expect(msg.markdown.content).toContain('...还有 3 条未展示')
  })

  test('does not show remaining count when all items fit', () => {
    const format = createWechatMessageFormatter()
    const items = [createItem({ summary: 's' })]
    const msg = format(items, 'ai')

    expect(msg.markdown.content).not.toContain('未展示')
  })

  test('shows fallback text when no items are included', () => {
    const format = createWechatMessageFormatter({ maxContentLength: 50, maxItems: 0 })
    const msg = format([createItem()], 'ai')

    expect(msg.markdown.content).toContain('暂无匹配内容')
  })

  test('handles empty items array', () => {
    const format = createWechatMessageFormatter()
    const msg = format([], 'ai')

    expect(msg.markdown.content).toContain('暂无匹配内容')
  })
})