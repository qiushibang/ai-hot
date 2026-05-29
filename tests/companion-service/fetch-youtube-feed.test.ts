import { describe, expect, test, vi } from 'vitest'

import { fetchYouTubeFeed } from '../../apps/companion-service/src/adapters/youtube/fetchYouTubeFeed'
import { extractYouTubeItems } from '../../apps/companion-service/src/adapters/youtube/extractYouTubeItems'

describe('fetchYouTubeFeed', () => {
  test('waits for rendered subscription cards before reading page content', async () => {
    // Arrange
    const page = {
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      content: vi.fn().mockResolvedValue(`
        <ytd-rich-item-renderer>
          <a id="video-title-link" href="https://www.youtube.com/watch?v=abc123">Claude Code demo</a>
          <yt-formatted-string id="channel-name">AI Lab</yt-formatted-string>
          <span id="metadata-line">124K views</span>
          <time datetime="2026-05-23T07:30:00.000Z"></time>
        </ytd-rich-item-renderer>
      `),
      close: vi.fn().mockResolvedValue(undefined)
    }
    const session = {
      openPage: vi.fn().mockResolvedValue(page)
    }

    // Act
    const items = await fetchYouTubeFeed(session as never)

    // Assert
    expect(page.waitForSelector).toHaveBeenCalledWith('ytd-rich-item-renderer')
    expect(items[0].platform).toBe('youtube')
    expect(page.close).toHaveBeenCalledTimes(1)
  })
})

describe('extractYouTubeItems', () => {
  test('maps ytd-rich-item-renderer cards into feed items', () => {
    const items = extractYouTubeItems(`
      <ytd-rich-item-renderer>
        <a id="video-title-link" href="https://www.youtube.com/watch?v=abc123">Claude Code demo</a>
        <yt-formatted-string id="channel-name">AI Lab</yt-formatted-string>
        <span id="metadata-line">124K views</span>
        <time datetime="2026-05-23T07:30:00.000Z"></time>
      </ytd-rich-item-renderer>
    `)

    expect(items[0].platform).toBe('youtube')
    expect(items[0].sourceId).toBe('abc123')
  })
})
