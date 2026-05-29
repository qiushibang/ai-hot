const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis'
const TOKEN_URL = `${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`
const SEND_MESSAGE_URL = `${FEISHU_API_BASE}/im/v1/messages`

export class FeishuApiError extends Error {
  public readonly code: number

  constructor(
    message: string,
    code: number
  ) {
    super(message)
    this.code = code
    this.name = 'FeishuApiError'
  }
}

export type ReceiveIdType = 'chat_id' | 'open_id'

export const detectReceiveIdType = (id: string): ReceiveIdType | null => {
  if (id.startsWith('oc_')) return 'chat_id'
  if (id.startsWith('ou_')) return 'open_id'
  return null
}

type TokenCache = {
  token: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

export const fetchTenantAccessToken = async (
  appId: string,
  appSecret: string,
  fetchImplementation: typeof fetch = fetch
): Promise<string> => {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token
  }

  const response = await fetchImplementation(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret })
  })

  if (!response.ok) {
    throw new FeishuApiError(
      `获取 tenant_access_token 失败: HTTP ${response.status}`,
      response.status
    )
  }

  const payload = (await response.json()) as {
    code: number
    msg: string
    tenant_access_token: string
    expire: number
  }

  if (payload.code !== 0) {
    throw new FeishuApiError(payload.msg, payload.code)
  }

  tokenCache = {
    token: payload.tenant_access_token,
    expiresAt: Date.now() + payload.expire * 1000
  }

  return tokenCache.token
}

type SendCardConfig = {
  appId: string
  appSecret: string
  receiveId: string
  receiveIdType: ReceiveIdType
}

type SendCardResult = { messageId: string }

export const createFeishuApiSender = (fetchImplementation: typeof fetch = fetch) => {
  return {
    async sendCardMessage(config: SendCardConfig, cardJson: string): Promise<SendCardResult> {
      const token = await fetchTenantAccessToken(
        config.appId,
        config.appSecret,
        fetchImplementation
      )

      const url = `${SEND_MESSAGE_URL}?receive_id_type=${config.receiveIdType}`

      const response = await fetchImplementation(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receive_id: config.receiveId,
          msg_type: 'interactive',
          content: cardJson
        })
      })

      if (!response.ok) {
        throw new FeishuApiError(
          `发送消息失败: HTTP ${response.status}`,
          response.status
        )
      }

      const payload = (await response.json()) as {
        code: number
        msg: string
        data?: { message_id?: string }
      }

      if (payload.code !== 0) {
        throw new FeishuApiError(payload.msg, payload.code)
      }

      return { messageId: payload.data?.message_id ?? '' }
    },

    clearTokenCache() {
      tokenCache = null
    }
  }
}