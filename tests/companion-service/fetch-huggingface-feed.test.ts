import { describe, expect, test, vi } from 'vitest'

import { fetchHuggingFaceFeed } from '../../apps/companion-service/src/adapters/huggingface/fetchHuggingFaceFeed'

describe('fetchHuggingFaceFeed', () => {
  test('maps Hugging Face model results into feed items', async () => {
    // Arrange
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'meta-llama/Llama-4-Scout',
          author: 'meta-llama',
          tags: ['text-generation', 'transformers', 'safetensors'],
          likes: 420,
          downloads: 18000,
          lastModified: '2026-05-22T07:30:00.000Z'
        }
      ]
    })

    // Act
    const items = await fetchHuggingFaceFeed(undefined, fetchImplementation as typeof fetch)

    // Assert
    expect(fetchImplementation).toHaveBeenCalledTimes(1)
    expect(items).toEqual([
      {
        id: 'huggingface:meta-llama/Llama-4-Scout',
        platform: 'huggingface',
        title: 'Llama-4-Scout',
        summary: 'text-generation · transformers · safetensors',
        url: 'https://huggingface.co/meta-llama/Llama-4-Scout',
        author: 'meta-llama',
        publishedAt: '2026-05-22T07:30:00.000Z',
        popularityScore: 18000,
        growthScore: 420,
        rawTags: ['text-generation', 'transformers', 'safetensors'],
        sourceId: 'meta-llama/Llama-4-Scout'
      }
    ])
  })

  test('uses createdAt when lastModified is absent', async () => {
    // Arrange
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'sentence-transformers/all-MiniLM-L6-v2',
          tags: ['sentence-transformers', 'transformers'],
          likes: 4816,
          downloads: 260087615,
          createdAt: '2022-03-02T23:29:05.000Z'
        }
      ]
    })

    // Act
    const items = await fetchHuggingFaceFeed(undefined, fetchImplementation as typeof fetch)

    // Assert
    expect(fetchImplementation).toHaveBeenCalledTimes(1)
    expect(items).toEqual([
      {
        id: 'huggingface:sentence-transformers/all-MiniLM-L6-v2',
        platform: 'huggingface',
        title: 'all-MiniLM-L6-v2',
        summary: 'sentence-transformers · transformers',
        url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2',
        author: 'sentence-transformers',
        publishedAt: '2022-03-02T23:29:05.000Z',
        popularityScore: 260087615,
        growthScore: 4816,
        rawTags: ['sentence-transformers', 'transformers'],
        sourceId: 'sentence-transformers/all-MiniLM-L6-v2'
      }
    ])
  })
})
