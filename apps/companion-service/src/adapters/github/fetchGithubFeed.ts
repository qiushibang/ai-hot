import { feedItemSchema, type FeedItem } from '@ai-hot/shared'
import { z } from 'zod'

const GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories'
const GITHUB_FEED_LIMIT = 10
const RECENT_REPOSITORY_WINDOW_DAYS = 30
const DEFAULT_GITHUB_SUMMARY = 'Popular AI repository on GitHub.'

const githubRepositorySchema = z.object({
  id: z.number().int().nonnegative(),
  full_name: z.string().min(1),
  html_url: z.string().url(),
  description: z.string().nullable(),
  stargazers_count: z.number().nonnegative(),
  forks_count: z.number().nonnegative(),
  topics: z.array(z.string()),
  updated_at: z.string().datetime(),
  owner: z.object({
    login: z.string().min(1)
  }),
  score: z.number().nonnegative().optional()
})

const githubSearchResponseSchema = z.object({
  items: z.array(githubRepositorySchema)
})

const getRecentDate = (daysBack: number): string => {
  const recentDate = new Date()
  recentDate.setUTCDate(recentDate.getUTCDate() - daysBack)

  return recentDate.toISOString().slice(0, 10)
}

const buildGithubSearchUrl = (searchQuery: string): string => {
  const searchUrl = new URL(GITHUB_SEARCH_URL)

  searchUrl.searchParams.set(
    'q',
    `${searchQuery} pushed:>=${getRecentDate(RECENT_REPOSITORY_WINDOW_DAYS)}`
  )
  searchUrl.searchParams.set('sort', 'stars')
  searchUrl.searchParams.set('order', 'desc')
  searchUrl.searchParams.set('per_page', String(GITHUB_FEED_LIMIT))

  return searchUrl.toString()
}

const mapGithubRepositoryToFeedItem = (
  repository: z.infer<typeof githubRepositorySchema>
): FeedItem => {
  return feedItemSchema.parse({
    id: `github:${repository.id}`,
    platform: 'github',
    title: repository.full_name,
    summary: repository.description ?? DEFAULT_GITHUB_SUMMARY,
    url: repository.html_url,
    author: repository.owner.login,
    publishedAt: repository.updated_at,
    popularityScore: repository.stargazers_count,
    growthScore: repository.score ?? repository.forks_count,
    rawTags: repository.topics,
    sourceId: repository.full_name
  })
}

export const fetchGithubFeed = async (
  searchQuery = 'artificial-intelligence',
  fetchImplementation: typeof fetch = fetch
): Promise<FeedItem[]> => {
  const response = await fetchImplementation(buildGithubSearchUrl(searchQuery), {
    headers: {
      Accept: 'application/vnd.github+json'
    }
  })

  if (!response.ok) {
    throw new Error('github feed request failed')
  }

  const payload = githubSearchResponseSchema.parse(await response.json())

  return payload.items.map(mapGithubRepositoryToFeedItem)
}
