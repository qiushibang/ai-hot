import { API_ROUTES, feedItemSchema, filterItemsByKeywords, type Settings } from '@ai-hot/shared'
import { Router, type Request, type Response } from 'express'
import { z, ZodError } from 'zod'

import { createFeishuCardFormatter } from '../push/formatFeishuCard'
import type { FeishuCardPayload } from '../push/formatFeishuCard'
import { createWechatMessageFormatter } from '../push/formatWechatMessage'
import type { WechatMessagePayload } from '../push/formatWechatMessage'
import {
  createFeishuApiSender,
  detectReceiveIdType,
  FeishuApiError
} from '../push/feishuApiClient'

type SettingsRepository = {
  get: () => Settings | null
}

const pushRequestSchema = z.object({
  items: z.array(feedItemSchema),
  searchQuery: z.string().optional()
})

type Formatters = {
  // eslint-disable-next-line no-unused-vars
  formatFeishuCard: (items: typeof feedItemSchema._output[], searchQuery: string) => FeishuCardPayload
  // eslint-disable-next-line no-unused-vars
  formatWechatMessage: (items: typeof feedItemSchema._output[], searchQuery: string) => WechatMessagePayload
}

type Dependencies = Partial<
  Formatters & { fetchImplementation: typeof fetch; feishuApiSender: ReturnType<typeof createFeishuApiSender> }
>

const createEmptySettingsRepository = (): SettingsRepository => ({
  get: () => null
})

const readWebhookUrl = (settings: Settings | null, channel: 'feishu' | 'wechat') => {
  if (!settings) {
    return null
  }

  return channel === 'feishu' ? settings.feishuWebhookUrl : settings.wechatWebhookUrl
}

const readMissingConfigMessage = (channel: 'feishu' | 'wechat') => {
  if (channel === 'feishu') {
    return '请先在设置页配置飞书推送（Webhook 或开放平台 API）'
  }

  return '请先在设置页配置企业微信 Webhook'
}

type FeishuApiCredentials = {
  appId: string
  appSecret: string
  receiveId: string
}

const readFeishuApiCredentials = (settings: Settings | null): FeishuApiCredentials | null => {
  if (!settings || !settings.feishuAppId || !settings.feishuAppSecret || !settings.feishuReceiveId) {
    return null
  }

  return {
    appId: settings.feishuAppId,
    appSecret: settings.feishuAppSecret,
    receiveId: settings.feishuReceiveId
  }
}

export const createPushRouter = (
  settingsRepository: SettingsRepository = createEmptySettingsRepository(),
  {
    formatFeishuCard = createFeishuCardFormatter(),
    formatWechatMessage = createWechatMessageFormatter(),
    fetchImplementation = fetch,
    feishuApiSender = createFeishuApiSender(fetchImplementation)
  }: Dependencies = {}
) => {
  const pushRouter = Router()

  const handleWebhookPush = async (
    channel: 'feishu' | 'wechat',
    filtered: z.infer<typeof feedItemSchema>[],
    searchQuery: string,
    webhookUrl: string,
    response: Response
  ) => {
    try {
      const payload =
        channel === 'feishu'
          ? formatFeishuCard(filtered, searchQuery.trim())
          : formatWechatMessage(filtered, searchQuery.trim())

      const webhookResponse = await fetchImplementation(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!webhookResponse.ok) {
        response.status(502).json({
          success: false,
          data: null,
          error: `webhook delivery failed: HTTP ${webhookResponse.status}`
        })
        return
      }

      response.status(200).json({
        success: true,
        data: { delivered: true, sent: filtered.length },
        error: null
      })
    } catch {
      response.status(502).json({
        success: false,
        data: null,
        error: 'webhook delivery failed'
      })
    }
  }

  const handlePush = (channel: 'feishu' | 'wechat') => {
    return async (request: Request, response: Response) => {
      try {
        pushRequestSchema.parse(request.body)
      } catch (error) {
        if (error instanceof ZodError) {
          response.status(400).json({
            success: false,
            data: null,
            error: 'push payload is invalid'
          })
          return
        }

        throw error
      }

      const settings = settingsRepository.get()
      const { items, searchQuery = '' } = request.body as { items: z.infer<typeof feedItemSchema>[]; searchQuery?: string }

      if (channel === 'feishu') {
        const apiCredentials = readFeishuApiCredentials(settings)

        if (apiCredentials) {
          const receiveIdType = detectReceiveIdType(apiCredentials.receiveId)
          if (!receiveIdType) {
            response.status(400).json({
              success: false,
              data: null,
              error: '无效的 Receive ID — 请以 oc_ 开头（群聊）或 ou_ 开头（私聊）'
            })
            return
          }
        } else {
          const webhookUrl = readWebhookUrl(settings, channel)
          if (!webhookUrl) {
            response.status(400).json({
              success: false,
              data: null,
              error: readMissingConfigMessage(channel)
            })
            return
          }
        }
      } else {
        const webhookUrl = readWebhookUrl(settings, channel)
        if (!webhookUrl) {
          response.status(400).json({
            success: false,
            data: null,
            error: readMissingConfigMessage(channel)
          })
          return
        }
      }

      const filtered = settings
        ? filterItemsByKeywords(items, settings.includeKeywords, settings.excludeKeywords)
        : items

      if (filtered.length === 0) {
        response.status(200).json({
          success: true,
          data: { delivered: true, sent: 0 },
          error: null
        })
        return
      }

      if (channel === 'feishu') {
        const apiCredentials = readFeishuApiCredentials(settings)

        if (apiCredentials) {
          const receiveIdType = detectReceiveIdType(apiCredentials.receiveId)!

          try {
            const cardPayload = formatFeishuCard(filtered, searchQuery.trim())
            const cardJson = JSON.stringify(cardPayload.card)
            const result = await feishuApiSender.sendCardMessage(
              {
                appId: apiCredentials.appId,
                appSecret: apiCredentials.appSecret,
                receiveId: apiCredentials.receiveId,
                receiveIdType
              },
              cardJson
            )

            response.status(200).json({
              success: true,
              data: { delivered: true, sent: filtered.length, messageId: result.messageId },
              error: null
            })
          } catch (error) {
            if (error instanceof FeishuApiError) {
              response.status(502).json({
                success: false,
                data: null,
                error: `飞书 API 错误: ${error.message} (code: ${error.code})`
              })
              return
            }

            response.status(502).json({
              success: false,
              data: null,
              error: '飞书 API 推送失败'
            })
          }
          return
        }

        const webhookUrl = readWebhookUrl(settings, channel)!
        await handleWebhookPush(channel, filtered, searchQuery, webhookUrl, response)
        return
      }

      const webhookUrl = readWebhookUrl(settings, channel)!
      await handleWebhookPush(channel, filtered, searchQuery, webhookUrl, response)
    }
  }

  pushRouter.post(API_ROUTES.pushFeishu, handlePush('feishu'))
  pushRouter.post(API_ROUTES.pushWechat, handlePush('wechat'))

  return pushRouter
}