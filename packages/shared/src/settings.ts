import { z } from 'zod'

import { platformSchema } from './feed'

export const pushChannelSchema = z.enum(['feishu', 'wechat'])

export const settingsSchema = z.object({
  includeKeywords: z.array(z.string()),
  excludeKeywords: z.array(z.string()),
  enabledPlatforms: z.array(platformSchema),
  feishuWebhookUrl: z.string().url().nullable(),
  wechatWebhookUrl: z.string().url().nullable(),
  feishuAppId: z.string().nullable().default(null),
  feishuAppSecret: z.string().nullable().default(null),
  feishuReceiveId: z.string().nullable().default(null),
  xTargetAccounts: z.array(z.string()).default([]),
  xMaxPerAccount: z.number().int().min(1).max(20).default(5)
})

export const createDefaultSettings = () =>
  settingsSchema.parse({
    includeKeywords: [],
    excludeKeywords: [],
    enabledPlatforms: ['github', 'x', 'youtube', 'huggingface'],
    feishuWebhookUrl: null,
    wechatWebhookUrl: null,
    xTargetAccounts: [],
    xMaxPerAccount: 5
  })

export type PushChannel = z.infer<typeof pushChannelSchema>
export type Settings = z.infer<typeof settingsSchema>
