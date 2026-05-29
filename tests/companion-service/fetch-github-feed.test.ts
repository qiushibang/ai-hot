import { describe, expect, test, vi } from 'vitest'

import { fetchGithubFeed } from '../../apps/companion-service/src/adapters/github/fetchGithubFeed'

describe('fetchGithubFeed', () => {
  test('maps GitHub repository search results into feed items', async () => {
    // Arrange
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 42,
            full_name: 'anthropic/claude-code',
            html_url: 'https://github.com/anthropic/claude-code',
            description: 'Agentic coding workflow for Claude.',
            stargazers_count: 1200,
            forks_count: 180,
            topics: ['ai', 'agent'],
            updated_at: '2026-05-22T08:00:00Z',
            owner: {
              login: 'anthropic'
            },
            score: 99.5
          }
        ]
      })
    })

    // Act
    const items = await fetchGithubFeed(undefined, fetchImplementation as typeof fetch)

    // Assert
    expect(fetchImplementation).toHaveBeenCalledTimes(1)
    expect(items).toEqual([
      {
        id: 'github:42',
        platform: 'github',
        title: 'anthropic/claude-code',
        summary: 'Agentic coding workflow for Claude.',
        url: 'https://github.com/anthropic/claude-code',
        author: 'anthropic',
        publishedAt: '2026-05-22T08:00:00Z',
        popularityScore: 1200,
        growthScore: 99.5,
        rawTags: ['ai', 'agent'],
        sourceId: 'anthropic/claude-code'
      }
    ])
  })
})
