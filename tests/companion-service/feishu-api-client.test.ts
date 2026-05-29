import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  FeishuApiError,
  createFeishuApiSender,
  detectReceiveIdType,
  fetchTenantAccessToken
} from '../../apps/companion-service/src/server/push/feishuApiClient'

describe('detectReceiveIdType', () => {
  test('returns chat_id for oc_ prefix', () => {
    expect(detectReceiveIdType('oc_abc123')).toBe('chat_id')
  })

  test('returns open_id for ou_ prefix', () => {
    expect(detectReceiveIdType('ou_xyz456')).toBe('open_id')
  })

  test('returns null for unrecognized prefix', () => {
    expect(detectReceiveIdType('random_id')).toBeNull()
  })

  test('returns null for empty string', () => {
    expect(detectReceiveIdType('')).toBeNull()
  })
})

describe('fetchTenantAccessToken', () => {
  afterEach(() => {
    const sender = createFeishuApiSender()
    sender.clearTokenCache()
    vi.restoreAllMocks()
  })

  test('fetches token from feishu API and returns it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        msg: 'ok',
        tenant_access_token: 'token-abc',
        expire: 7200
      })
    })

    const token = await fetchTenantAccessToken('app-id', 'app-secret', fetchMock as unknown as typeof fetch)

    expect(token).toBe('token-abc')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: 'app-id', app_secret: 'app-secret' })
      })
    )
  })

  test('caches token and reuses it on subsequent calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        msg: 'ok',
        tenant_access_token: 'token-cached',
        expire: 7200
      })
    })

    const token1 = await fetchTenantAccessToken('app-id', 'app-secret', fetchMock as unknown as typeof fetch)
    const token2 = await fetchTenantAccessToken('app-id', 'app-secret', fetchMock as unknown as typeof fetch)

    expect(token1).toBe('token-cached')
    expect(token2).toBe('token-cached')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('throws FeishuApiError when API returns non-zero code', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 999,
        msg: 'invalid app secret',
        tenant_access_token: '',
        expire: 0
      })
    })

    await expect(
      fetchTenantAccessToken('app-id', 'bad-secret', fetchMock as unknown as typeof fetch)
    ).rejects.toThrow(FeishuApiError)

    await expect(
      fetchTenantAccessToken('app-id', 'bad-secret', fetchMock as unknown as typeof fetch)
    ).rejects.toThrow('invalid app secret')
  })

  test('throws FeishuApiError on HTTP failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    })

    await expect(
      fetchTenantAccessToken('app-id', 'app-secret', fetchMock as unknown as typeof fetch)
    ).rejects.toThrow(FeishuApiError)
  })
})

describe('createFeishuApiSender', () => {
  beforeEach(() => {
    const sender = createFeishuApiSender()
    sender.clearTokenCache()
    vi.restoreAllMocks()
  })

  test('sendCardMessage sends message and returns messageId', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          msg: 'ok',
          tenant_access_token: 'token-send',
          expire: 7200
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          msg: 'ok',
          data: { message_id: 'msg-001' }
        })
      })

    const sender = createFeishuApiSender(fetchMock as unknown as typeof fetch)

    const result = await sender.sendCardMessage(
      {
        appId: 'app-id',
        appSecret: 'app-secret',
        receiveId: 'oc_group123',
        receiveIdType: 'chat_id'
      },
      JSON.stringify({ header: { title: { content: 'hello' } } })
    )

    expect(result).toEqual({ messageId: 'msg-001' })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-send'
        }),
        body: JSON.stringify({
          receive_id: 'oc_group123',
          msg_type: 'interactive',
          content: JSON.stringify({ header: { title: { content: 'hello' } } })
        })
      })
    )
  })

  test('throws FeishuApiError when send fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          msg: 'ok',
          tenant_access_token: 'token-fail',
          expire: 7200
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 11223,
          msg: 'receive_id not found'
        })
      })

    const sender = createFeishuApiSender(fetchMock as unknown as typeof fetch)

    await expect(
      sender.sendCardMessage(
        {
          appId: 'app-id',
          appSecret: 'app-secret',
          receiveId: 'oc_bad_id',
          receiveIdType: 'chat_id'
        },
        JSON.stringify({})
      )
    ).rejects.toThrow(FeishuApiError)
  })

  test('clearTokenCache resets cached token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        msg: 'ok',
        tenant_access_token: 'token-first',
        expire: 7200
      })
    })

    const sender = createFeishuApiSender(fetchMock as unknown as typeof fetch)

    await fetchTenantAccessToken('app-id', 'app-secret', fetchMock as unknown as typeof fetch)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    sender.clearTokenCache()

    const fetchMock2 = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        msg: 'ok',
        tenant_access_token: 'token-second',
        expire: 7200
      })
    })

    const token = await fetchTenantAccessToken('app-id', 'app-secret', fetchMock2 as unknown as typeof fetch)

    expect(token).toBe('token-second')
    expect(fetchMock2).toHaveBeenCalledTimes(1)
  })
})