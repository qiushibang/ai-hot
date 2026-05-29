import { describe, expect, test, vi } from 'vitest'

import { fetchXFeedViaApi } from '../../apps/companion-service/src/adapters/x/fetchXFeedViaApi'

describe('fetchXFeedViaApi', () => {
  test('parses a successful SearchTimeline response into FeedItems', async () => {
    const mockResponse = {
      data: {
        search_by_raw_query: {
          search_timeline: {
            timeline: {
              instructions: [
                {
                  type: 'TimelineAddEntries',
                  entries: [
                    {
                      entryId: 'tweet-123456',
                      content: {
                        itemContent: {
                          tweet_results: {
                            result: {
                              rest_id: '123456',
                              legacy: {
                                full_text: 'AI is transforming everything',
                                created_at: 'Wed May 21 12:00:00 +0000 2025',
                                retweet_count: 42,
                                favorite_count: 100
                              },
                              core: {
                                user_results: {
                                  result: {
                                    legacy: {
                                      name: 'Tech Reporter',
                                      screen_name: 'techreporter'
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  ]
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

    const items = await fetchXFeedViaApi(authFetch)

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('x:123456')
    expect(items[0].platform).toBe('x')
    expect(items[0].title).toBe('AI is transforming everything')
    expect(items[0].url).toBe('https://x.com/techreporter/status/123456')
    expect(items[0].author).toBe('techreporter')
    expect(items[0].popularityScore).toBe(42)
  })

  test('returns empty array for empty search results', async () => {
    const mockResponse = {
      data: {
        search_by_raw_query: {
          search_timeline: {
            timeline: {
              instructions: []
            }
          }
        }
      }
    }

    const authFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const items = await fetchXFeedViaApi(authFetch)

    expect(items).toEqual([])
  })

  test('throws when the API returns a non-200 response', async () => {
    const authFetch = vi.fn().mockResolvedValue(
      new Response('rate limited', { status: 429 })
    )

    await expect(fetchXFeedViaApi(authFetch)).rejects.toThrow('x feed request failed')
  })
})