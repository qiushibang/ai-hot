import { describe, expect, test } from 'vitest'

import {
  API_ROUTES,
  feedItemSchema,
  platformSchema,
  platformStatusSchema,
  pushChannelSchema,
  settingsSchema,
  todayFeedSchema
} from '../../packages/shared/src/index'

describe('shared domain schemas and API contracts', () => {
  test('defines platform and push channel enums', () => {
    expect(platformSchema.options).toEqual([
      'github',
      'x',
      'youtube',
      
      'huggingface'
    ])

    expect(pushChannelSchema.options).toEqual(['feishu', 'wechat'])
  })

  test('validates a complete feed item', () => {
    const result = feedItemSchema.parse({
      id: 'item-1',
      platform: 'github',
      title: 'New release',
      summary: 'A useful summary',
      url: 'https://example.com/item-1',
      author: 'octocat',
      publishedAt: '2026-05-21T08:30:00.000Z',
      popularityScore: 10,
      growthScore: 2,
      rawTags: ['ai', 'release'],
      sourceId: 'source-1'
    })

    expect(result).toEqual({
      id: 'item-1',
      platform: 'github',
      title: 'New release',
      summary: 'A useful summary',
      url: 'https://example.com/item-1',
      author: 'octocat',
      publishedAt: '2026-05-21T08:30:00.000Z',
      popularityScore: 10,
      growthScore: 2,
      rawTags: ['ai', 'release'],
      sourceId: 'source-1'
    })
  })

  test('rejects empty required string fields in feed items', () => {
    expect(() =>
      feedItemSchema.parse({
        id: '',
        platform: 'github',
        title: '',
        summary: '',
        url: 'https://example.com/item-empty',
        author: '',
        publishedAt: '2026-05-21T08:30:00.000Z',
        popularityScore: 1,
        growthScore: 0,
        rawTags: [],
        sourceId: ''
      })
    ).toThrow()
  })

  test('rejects negative scores and invalid datetimes in feed items', () => {
    expect(() =>
      feedItemSchema.parse({
        id: 'item-2',
        platform: 'x',
        title: 'Bad item',
        summary: 'Invalid payload',
        url: 'https://example.com/item-2',
        author: 'someone',
        publishedAt: 'not-a-datetime',
        popularityScore: -1,
        growthScore: -5,
        rawTags: [],
        sourceId: 'source-2'
      })
    ).toThrow()
  })

  test('accepts settings with nullable webhook urls and enabled platforms', () => {
    const result = settingsSchema.parse({
      includeKeywords: ['agent', 'ranking'],
      excludeKeywords: ['spam'],
      enabledPlatforms: ['github', 'youtube'],
      feishuWebhookUrl: null,
      wechatWebhookUrl: 'https://example.com/wechat'
    })

    expect(result).toEqual({
      includeKeywords: ['agent', 'ranking'],
      excludeKeywords: ['spam'],
      enabledPlatforms: ['github', 'youtube'],
      feishuWebhookUrl: null,
      wechatWebhookUrl: 'https://example.com/wechat',
      feishuAppId: null,
      feishuAppSecret: null,
      feishuReceiveId: null,
      xTargetAccounts: [],
      xMaxPerAccount: 5
    })
  })

  test('rejects invalid platform values and invalid webhook urls in settings', () => {
    expect(() =>
      settingsSchema.parse({
        includeKeywords: [],
        excludeKeywords: [],
        enabledPlatforms: ['reddit'],
        feishuWebhookUrl: 'not-a-url',
        wechatWebhookUrl: null
      })
    ).toThrow()
  })

  test('parses platform runtime status and today feed buckets', () => {
    const status = platformStatusSchema.parse({
      platform: 'x', state: 'not_logged_in',
      detail: '当前浏览器未登录该平台',
      lastUpdatedAt: '2026-05-23T10:00:00.000Z',
      lastCollectedAt: null
    })

    const todayFeed = todayFeedSchema.parse({
      github: { items: [], message: '今日结果较少', state: 'no_results' },
      x: { items: [], message: '当前浏览器未登录该平台', state: 'not_logged_in' },
      youtube: { items: [], message: '浏览器 profile 不可用', state: 'profile_unavailable' },
      huggingface: { items: [], message: null, state: 'ready' }
    })

    expect(status.state).toBe('not_logged_in')
    expect(todayFeed.x.message).toBe('当前浏览器未登录该平台')
  })

  test('exports stable API routes', () => {
    expect(API_ROUTES).toEqual({
      todayFeed: '/api/feed/today',
      collect: '/api/feed/collect',
      favorites: '/api/favorites',
      settings: '/api/settings',
      status: '/api/status',
      platformStatuses: '/api/status/platforms',
      pushFeishu: '/api/push/feishu',
      pushWechat: '/api/push/wechat'
    })
  })
})
