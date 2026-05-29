import { describe, expect, test, vi } from 'vitest'

import { fetchXFeed } from '../../apps/companion-service/src/adapters/x/fetchXFeed'
import { extractXItems } from '../../apps/companion-service/src/adapters/x/extractXItems'

describe('fetchXFeed', () => {
  test('waits for rendered tweet cards before reading page content', async () => {
    // Arrange
    const page = {
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      mouse: { move: vi.fn().mockResolvedValue(undefined) },
      evaluate: vi.fn().mockResolvedValue(undefined),
      content: vi.fn().mockResolvedValue(`
        <article data-testid="tweet">
          <a href="https://x.com/agentic/status/42">link</a>
          <div lang="en">New open-source AI agent release</div>
          <div data-testid="User-Name">agentic</div>
          <time datetime="2026-05-23T09:00:00.000Z"></time>
          <span data-retweets="84"></span>
        </article>
      `),
      close: vi.fn().mockResolvedValue(undefined)
    }
    const session = {
      openPage: vi.fn().mockResolvedValue(page)
    }

    // Act
    const items = await fetchXFeed(session as never)

    // Assert
    expect(page.waitForLoadState).toHaveBeenCalledWith('domcontentloaded')
    expect(items[0].platform).toBe('x')
    expect(page.close).toHaveBeenCalledTimes(1)
  })
})

describe('extractXItems', () => {
  test('maps tweet cards into feed items', () => {
    const items = extractXItems(`
      <article data-testid="tweet">
        <a href="https://x.com/agentic/status/42">link</a>
        <div lang="en">New open-source AI agent release</div>
        <div data-testid="User-Name">agentic</div>
        <time datetime="2026-05-23T09:00:00.000Z"></time>
        <span data-retweets="84"></span>
      </article>
    `)

    expect(items[0].platform).toBe('x')
    expect(items[0].url).toBe('https://x.com/agentic/status/42')
    expect(items[0].author).toBe('agentic')
  })
})
