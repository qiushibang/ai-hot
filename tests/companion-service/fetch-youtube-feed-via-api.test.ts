import { describe, expect, test, vi } from 'vitest'

import { fetchYouTubeFeedViaApi } from '../../apps/companion-service/src/adapters/youtube/fetchYouTubeFeedViaApi'

describe('fetchYouTubeFeedViaApi', () => {
  test('parses a successful search response into FeedItems', async () => {
    const mockResponse = {
      contents: {
        twoColumnSearchResultsRenderer: {
          primaryContents: {
            sectionListRenderer: {
              contents: [
                {
                  itemSectionRenderer: {
                    contents: [
                      {
                        videoRenderer: {
                          videoId: 'abc123',
                          title: { runs: [{ text: 'Best AI Video' }] },
                          ownerText: { runs: [{ text: 'AI Channel' }] },
                          publishedTimeText: { simpleText: '2 days ago' },
                          viewCountText: { simpleText: '50K views' },
                          lengthText: { simpleText: '10:30' }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        }
      }
    }

    const authFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const items = await fetchYouTubeFeedViaApi(authFetch)

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('youtube:abc123')
    expect(items[0].platform).toBe('youtube')
    expect(items[0].title).toBe('Best AI Video')
    expect(items[0].url).toBe('https://www.youtube.com/watch?v=abc123')
    expect(items[0].author).toBe('AI Channel')
    expect(items[0].popularityScore).toBe(50000)
  })

  test('returns empty array for empty search results', async () => {
    const mockResponse = {
      contents: {
        twoColumnSearchResultsRenderer: {
          primaryContents: {
            sectionListRenderer: {
              contents: []
            }
          }
        }
      }
    }

    const authFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const items = await fetchYouTubeFeedViaApi(authFetch)

    expect(items).toEqual([])
  })

  test('throws when the API returns a non-200 response', async () => {
    const authFetch = vi.fn().mockResolvedValue(
      new Response('server error', { status: 500 })
    )

    await expect(fetchYouTubeFeedViaApi(authFetch)).rejects.toThrow(
      'youtube feed request failed'
    )
  })
})