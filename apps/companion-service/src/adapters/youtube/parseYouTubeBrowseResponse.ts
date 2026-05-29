import { feedItemSchema, type FeedItem } from '@ai-hot/shared'
import { z } from 'zod'

const YOUTUBE_FEED_LIMIT = 10
const DEFAULT_YOUTUBE_SUMMARY = '热门 YouTube AI 视频'

const parseViewCount = (text: string): number => {
  const cleaned = text
    .replace(/,/g, '')
    .replace(/\s*views?\s*$/i, '')
    .trim()
    .toUpperCase()

  if (cleaned.endsWith('K')) {
    return Math.round(parseFloat(cleaned) * 1000)
  }

  if (cleaned.endsWith('M')) {
    return Math.round(parseFloat(cleaned) * 1000000)
  }

  const parsed = parseInt(cleaned, 10)

  return Number.isNaN(parsed) ? 0 : parsed
}

const videoRendererSchema = z.object({
  videoId: z.string().min(1),
  title: z.object({
    runs: z.array(z.object({ text: z.string() }))
  }),
  ownerText: z.object({
    runs: z.array(z.object({ text: z.string() }))
  }),
  publishedTimeText: z.object({ simpleText: z.string() }).optional(),
  viewCountText: z.object({ simpleText: z.string() }).optional(),
  lengthText: z.object({ simpleText: z.string() }).optional()
})

const richItemContentSchema = z.object({
  videoRenderer: videoRendererSchema
})

const richItemSchema = z.object({
  richItemRenderer: z.object({
    content: richItemContentSchema
  })
})

const itemSectionContentsSchema = z.object({
  itemSectionRenderer: z.object({
    contents: z.array(richItemSchema).default([])
  })
})

const sectionListContentSchema = z.object({
  sectionListRenderer: z.object({
    contents: z.array(itemSectionContentsSchema).default([])
  })
})

const tabContentSchema = z.object({
  tabRenderer: z.object({
    content: sectionListContentSchema.optional().default({ sectionListRenderer: { contents: [] } })
  })
})

const browseResponseSchema = z.object({
  contents: z.object({
    twoColumnBrowseResultsRenderer: z.object({
      tabs: z.array(tabContentSchema).default([])
    })
  })
})

const mapVideoToFeedItem = (
  video: z.infer<typeof videoRendererSchema>
): FeedItem => {
  const title = video.title.runs[0]?.text ?? 'YouTube video'
  const author = video.ownerText.runs[0]?.text ?? 'youtube'
  const viewCount = video.viewCountText
    ? parseViewCount(video.viewCountText.simpleText)
    : 0

  return feedItemSchema.parse({
    id: `youtube:${video.videoId}`,
    platform: 'youtube',
    title,
    summary: DEFAULT_YOUTUBE_SUMMARY,
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
    author,
    publishedAt: new Date().toISOString(),
    popularityScore: viewCount,
    growthScore: 0,
    rawTags: ['youtube'],
    sourceId: video.videoId
  })
}

export const parseYouTubeBrowseResponse = (payload: unknown): FeedItem[] => {
  const parsed = browseResponseSchema.parse(payload)

  const tabs = parsed.contents.twoColumnBrowseResultsRenderer.tabs

  const videos = tabs.flatMap((tab) => {
    const sectionList = tab.tabRenderer.content.sectionListRenderer

    return sectionList.contents.flatMap((section) =>
      section.itemSectionRenderer.contents.map(
        (item) => item.richItemRenderer.content.videoRenderer
      )
    )
  })

  return videos.slice(0, YOUTUBE_FEED_LIMIT).map(mapVideoToFeedItem)
}