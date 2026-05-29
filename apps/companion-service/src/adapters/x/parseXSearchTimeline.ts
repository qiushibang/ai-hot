import { feedItemSchema, type FeedItem } from '@ai-hot/shared'
import { z } from 'zod'

const X_FEED_LIMIT = 10
const DEFAULT_X_SUMMARY = '热门 X / Twitter AI 内容'

const tweetResultSchema = z.object({
  rest_id: z.string().min(1),
  legacy: z.object({
    full_text: z.string().min(1),
    created_at: z.string(),
    retweet_count: z.number().nonnegative().default(0),
    favorite_count: z.number().nonnegative().default(0),
    in_reply_to_status_id_str: z.string().optional()
  }),
  core: z.object({
    user_results: z.object({
      result: z.object({
        legacy: z.object({
          name: z.string(),
          screen_name: z.string().min(1)
        })
      })
    })
  })
})

const tweetEntrySchema = z.object({
  entryId: z.string(),
  content: z.object({
    itemContent: z.object({
      tweet_results: z.object({
        result: tweetResultSchema
      })
    })
  })
})

const timelineAddEntriesSchema = z.object({
  type: z.literal('TimelineAddEntries'),
  entries: z.array(z.unknown()).default([])
})

const searchTimelineResponseSchema = z.object({
  data: z.object({
    search_by_raw_query: z.object({
      search_timeline: z.object({
        timeline: z.object({
          instructions: z.array(timelineAddEntriesSchema).default([])
        })
      })
    })
  })
})

const mapTweetToFeedItem = (
  tweet: z.infer<typeof tweetResultSchema>
): FeedItem => {
  const screenName = tweet.core.user_results.result.legacy.screen_name

  return feedItemSchema.parse({
    id: `x:${tweet.rest_id}`,
    platform: 'x',
    title: tweet.legacy.full_text,
    summary: DEFAULT_X_SUMMARY,
    url: `https://x.com/${screenName}/status/${tweet.rest_id}`,
    author: screenName,
    publishedAt: new Date(tweet.legacy.created_at).toISOString(),
    popularityScore: tweet.legacy.retweet_count,
    growthScore: tweet.legacy.favorite_count,
    rawTags: ['x'],
    sourceId: tweet.rest_id
  })
}

const isTweetEntry = (entry: unknown): entry is z.infer<typeof tweetEntrySchema> => {
  return tweetEntrySchema.safeParse(entry).success
}

const isNotReply = (tweet: z.infer<typeof tweetResultSchema>): boolean => {
  return !tweet.legacy.in_reply_to_status_id_str
}

export const parseXSearchTimeline = (payload: unknown): FeedItem[] => {
  const parsed = searchTimelineResponseSchema.parse(payload)

  const entries = parsed.data.search_by_raw_query.search_timeline.timeline.instructions.flatMap(
    (instruction) => instruction.entries
  )

  return entries
    .filter(isTweetEntry)
    .map((entry) => entry.content.itemContent.tweet_results.result)
    .filter(isNotReply)
    .slice(0, X_FEED_LIMIT)
    .map(mapTweetToFeedItem)
}