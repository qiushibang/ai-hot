import { z } from 'zod'

export const platformSchema = z.enum([
  'github',
  'x',
  'youtube',
  'huggingface'
])

export const platformCollectionStateSchema = z.enum([
  'ready',
  'no_results',
  'browser_unavailable',
  'profile_unavailable',
  'not_logged_in',
  'session_busy',
  'parse_failed',
  'platform_unavailable'
])

const nonEmptyStringSchema = z.string().min(1)

export const feedItemSchema = z.object({
  id: nonEmptyStringSchema,
  platform: platformSchema,
  title: nonEmptyStringSchema,
  summary: nonEmptyStringSchema,
  url: z.string().url(),
  author: nonEmptyStringSchema,
  publishedAt: z.string().datetime(),
  popularityScore: z.number().nonnegative(),
  growthScore: z.number().nonnegative(),
  rawTags: z.array(z.string()),
  sourceId: nonEmptyStringSchema
})

export const feedBucketSchema = z.object({
  items: z.array(feedItemSchema),
  message: z.string().nullable(),
  state: platformCollectionStateSchema
})

export const todayFeedSchema = z.object({
  github: feedBucketSchema,
  x: feedBucketSchema,
  youtube: feedBucketSchema,
  huggingface: feedBucketSchema
})

export const platformStatusSchema = z.object({
  platform: platformSchema,
  state: platformCollectionStateSchema,
  detail: z.string().nullable(),
  lastUpdatedAt: z.string().datetime().nullable(),
  lastCollectedAt: z.string().datetime().nullable()
})

export type Platform = z.infer<typeof platformSchema>
export type FeedItem = z.infer<typeof feedItemSchema>
export type FeedBucket = z.infer<typeof feedBucketSchema>
export type TodayFeed = z.infer<typeof todayFeedSchema>
export type PlatformCollectionState = z.infer<typeof platformCollectionStateSchema>
export type PlatformStatus = z.infer<typeof platformStatusSchema>
