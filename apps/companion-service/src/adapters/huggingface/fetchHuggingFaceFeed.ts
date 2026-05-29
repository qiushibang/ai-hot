import { feedItemSchema, type FeedItem } from '@ai-hot/shared'
import { z } from 'zod'

const HUGGING_FACE_MODELS_URL = 'https://huggingface.co/api/models'
const HUGGING_FACE_FEED_LIMIT = 10
const DEFAULT_HUGGING_FACE_SUMMARY = 'Popular model on Hugging Face.'
const SUMMARY_TAG_LIMIT = 3

const huggingFaceModelSchema = z
  .object({
    id: z.string().min(1),
    author: z.string().min(1).optional(),
    tags: z.array(z.string()).default([]),
    likes: z.number().nonnegative().optional(),
    downloads: z.number().nonnegative().optional(),
    createdAt: z.string().datetime().optional(),
    lastModified: z.string().datetime().optional()
  })
  .refine((model) => model.lastModified !== undefined || model.createdAt !== undefined, {
    message: 'expected createdAt or lastModified',
    path: ['createdAt']
  })

const buildHuggingFaceModelsUrl = (searchQuery?: string): string => {
  const modelsUrl = new URL(HUGGING_FACE_MODELS_URL)

  modelsUrl.searchParams.set('sort', 'downloads')
  modelsUrl.searchParams.set('direction', '-1')
  modelsUrl.searchParams.set('limit', String(HUGGING_FACE_FEED_LIMIT))
  if (searchQuery) {
    modelsUrl.searchParams.set('search', searchQuery)
  }

  return modelsUrl.toString()
}

const getModelTitle = (modelId: string): string => {
  return modelId.split('/').at(-1) ?? modelId
}

const getModelAuthor = (model: z.infer<typeof huggingFaceModelSchema>): string => {
  return model.author ?? model.id.split('/')[0] ?? 'huggingface'
}

const getModelSummary = (tags: string[]): string => {
  if (tags.length === 0) {
    return DEFAULT_HUGGING_FACE_SUMMARY
  }

  return tags.slice(0, SUMMARY_TAG_LIMIT).join(' · ')
}

const getModelPublishedAt = (
  model: z.infer<typeof huggingFaceModelSchema>
): string => {
  return model.lastModified ?? model.createdAt!
}

const mapHuggingFaceModelToFeedItem = (
  model: z.infer<typeof huggingFaceModelSchema>
): FeedItem => {
  return feedItemSchema.parse({
    id: `huggingface:${model.id}`,
    platform: 'huggingface',
    title: getModelTitle(model.id),
    summary: getModelSummary(model.tags),
    url: `https://huggingface.co/${model.id}`,
    author: getModelAuthor(model),
    publishedAt: getModelPublishedAt(model),
    popularityScore: model.downloads ?? 0,
    growthScore: model.likes ?? 0,
    rawTags: model.tags,
    sourceId: model.id
  })
}

export const fetchHuggingFaceFeed = async (
  searchQuery?: string,
  fetchImplementation: typeof fetch = fetch
): Promise<FeedItem[]> => {
  const response = await fetchImplementation(buildHuggingFaceModelsUrl(searchQuery))

  if (!response.ok) {
    throw new Error('huggingface feed request failed')
  }

  const payload = z.array(huggingFaceModelSchema).parse(await response.json())

  return payload.map(mapHuggingFaceModelToFeedItem)
}
